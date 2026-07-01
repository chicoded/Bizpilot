import { prisma } from "@/lib/db";
import type { BusinessTaxProfile } from "@prisma/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { getActiveTaxRules } from "@/lib/tax/rules";
import type { TaxRulesMap } from "@/lib/tax/constants";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimateIncomeTax(params: {
  profit: number;
  revenue: number;
  profile: BusinessTaxProfile | null;
  rules: TaxRulesMap;
}): number {
  const profit = Math.max(0, params.profit);
  const revenue = Math.max(0, params.revenue);

  if (params.profile?.registeredBusiness) {
    const cit = profit * params.rules.cit_company_rate;
    const levy = profit * params.rules.development_levy_rate;
    return roundMoney(cit + levy);
  }

  return roundMoney(revenue * params.rules.presumptive_tax_rate);
}

function calculateConfidence(params: {
  profile: BusinessTaxProfile | null;
  salesCount: number;
  expenseCount: number;
}): number {
  let score = 55;
  if (params.profile?.state) score += 5;
  if (params.profile?.tin) score += 10;
  if (params.profile?.registeredBusiness !== undefined) score += 5;
  if (params.salesCount > 0) score += 10;
  if (params.expenseCount > 0) score += 10;
  if (params.profile?.vatRegistered && params.profile.vatEnabled) score += 5;
  return Math.min(95, score);
}

async function aggregatePeriod(
  businessId: string,
  start: Date,
  end: Date
) {
  const [sales, expenses, salesCount, expenseCount] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: start, lte: end } },
      _sum: { total: true, profit: true, tax: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { businessId, date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.count({
      where: { businessId, createdAt: { gte: start, lte: end } },
    }),
    prisma.expense.count({
      where: { businessId, date: { gte: start, lte: end } },
    }),
  ]);

  return {
    revenue: Number(sales._sum.total ?? 0),
    grossProfit: Number(sales._sum.profit ?? 0),
    vatCollected: Number(sales._sum.tax ?? 0),
    expenses: Number(expenses._sum.amount ?? 0),
    salesCount,
    expenseCount,
  };
}

export async function recalculateTaxEstimate(
  businessId: string,
  date = new Date()
) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  const [profile, rules, period] = await Promise.all([
    prisma.businessTaxProfile.findUnique({ where: { businessId } }),
    getActiveTaxRules("NG"),
    aggregatePeriod(businessId, start, end),
  ]);

  const estimatedProfit = roundMoney(period.grossProfit - period.expenses);
  const estimatedTax = estimateIncomeTax({
    profit: estimatedProfit,
    revenue: period.revenue,
    profile,
    rules,
  });

  const confidence = calculateConfidence({
    profile,
    salesCount: period.salesCount,
    expenseCount: period.expenseCount,
  });

  const ytdStart = startOfYear(date);
  const ytd = await aggregatePeriod(businessId, ytdStart, endOfYear(date));
  const annualizedRevenue = ytd.revenue;

  return prisma.taxEstimate.upsert({
    where: { businessId_month_year: { businessId, month, year } },
    create: {
      businessId,
      month,
      year,
      estimatedRevenue: period.revenue,
      estimatedExpenses: period.expenses,
      estimatedProfit,
      estimatedVATCollected: period.vatCollected,
      estimatedTax,
      confidence,
      metadata: {
        annualizedRevenue,
        approachingVatThreshold:
          annualizedRevenue >= rules.vat_annual_threshold * 0.85 &&
          !profile?.vatRegistered,
      },
    },
    update: {
      estimatedRevenue: period.revenue,
      estimatedExpenses: period.expenses,
      estimatedProfit,
      estimatedVATCollected: period.vatCollected,
      estimatedTax,
      confidence,
      metadata: {
        annualizedRevenue,
        approachingVatThreshold:
          annualizedRevenue >= rules.vat_annual_threshold * 0.85 &&
          !profile?.vatRegistered,
      },
    },
  });
}

export async function triggerTaxRecalculation(businessId: string) {
  try {
    await recalculateTaxEstimate(businessId);
  } catch (error) {
    console.error("triggerTaxRecalculation:", error);
  }
}

export async function getTodayTaxSnapshot(businessId: string) {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const [period, profile, rules] = await Promise.all([
    aggregatePeriod(businessId, start, end),
    prisma.businessTaxProfile.findUnique({ where: { businessId } }),
    getActiveTaxRules("NG"),
  ]);

  const estimatedProfit = roundMoney(period.grossProfit - period.expenses);
  const estimatedTax = estimateIncomeTax({
    profit: estimatedProfit,
    revenue: period.revenue,
    profile,
    rules,
  });

  return {
    revenue: period.revenue,
    vatCollected: period.vatCollected,
    profit: estimatedProfit,
    estimatedTax,
    vatEnabled: Boolean(profile?.vatEnabled && profile.vatRegistered),
    vatRate: rules.vat_rate,
  };
}

export async function getTaxForecast(businessId: string) {
  const now = new Date();
  const ytdStart = startOfYear(now);
  const ytdEnd = endOfYear(now);
  const month = now.getMonth() + 1;

  const [ytd, profile, rules, monthly] = await Promise.all([
    aggregatePeriod(businessId, ytdStart, now),
    prisma.businessTaxProfile.findUnique({ where: { businessId } }),
    getActiveTaxRules("NG"),
    prisma.taxEstimate.findFirst({
      where: { businessId, month, year: now.getFullYear() },
    }),
  ]);

  const monthsElapsed = Math.max(1, month);
  const projectedAnnualRevenue = (ytd.revenue / monthsElapsed) * 12;
  const projectedAnnualProfit =
    ((ytd.grossProfit - ytd.expenses) / monthsElapsed) * 12;
  const projectedAnnualTax = estimateIncomeTax({
    profit: projectedAnnualProfit,
    revenue: projectedAnnualRevenue,
    profile,
    rules,
  });

  return {
    ytdRevenue: ytd.revenue,
    ytdProfit: ytd.grossProfit - ytd.expenses,
    ytdVat: ytd.vatCollected,
    projectedAnnualRevenue: roundMoney(projectedAnnualRevenue),
    projectedAnnualProfit: roundMoney(projectedAnnualProfit),
    projectedAnnualTax: roundMoney(projectedAnnualTax),
    monthlyEstimate: monthly,
    vatThreshold: rules.vat_annual_threshold,
  };
}
