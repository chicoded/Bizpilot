import { prisma } from "@/lib/db";
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { getActiveTaxRules } from "@/lib/tax/rules";
import type { TaxInsight } from "@/types/tax";

export type ComplianceCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: "ok" | "warn";
};

export async function calculateComplianceScore(
  businessId: string
): Promise<{ score: number; checks: ComplianceCheck[] }> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    profile,
    salesToday,
    expensesMonth,
    negativeStock,
    rules,
    ytdRevenue,
  ] = await Promise.all([
    prisma.businessTaxProfile.findUnique({ where: { businessId } }),
    prisma.sale.count({
      where: { businessId, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.expense.count({
      where: { businessId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.product.count({
      where: { businessId, isActive: true, quantity: { lt: 0 } },
    }),
    getActiveTaxRules("NG"),
    prisma.sale.aggregate({
      where: {
        businessId,
        createdAt: { gte: new Date(now.getFullYear(), 0, 1), lte: now },
      },
      _sum: { total: true },
    }),
  ]);

  const annualRevenue = Number(ytdRevenue._sum.total ?? 0);
  const profileComplete = Boolean(
    profile?.state && profile.businessType && profile.annualRevenueBand
  );

  const checks: ComplianceCheck[] = [
    {
      id: "sales-today",
      label: "Daily sales recorded",
      passed: salesToday > 0,
      severity: salesToday > 0 ? "ok" : "warn",
    },
    {
      id: "expenses-month",
      label: "Expenses recorded this month",
      passed: expensesMonth > 0,
      severity: expensesMonth > 0 ? "ok" : "warn",
    },
    {
      id: "inventory",
      label: "Inventory balanced (no negative stock)",
      passed: negativeStock === 0,
      severity: negativeStock === 0 ? "ok" : "warn",
    },
    {
      id: "tax-profile",
      label: "Tax profile completed",
      passed: profileComplete,
      severity: profileComplete ? "ok" : "warn",
    },
    {
      id: "vat-filing",
      label: profile?.vatRegistered
        ? "VAT settings configured"
        : "VAT registration status set",
      passed: profile ? profile.vatRegistered === profile.vatEnabled || !profile.vatRegistered : false,
      severity:
        profile?.vatRegistered && !profile.vatEnabled ? "warn" : "ok",
    },
    {
      id: "vat-threshold",
      label: "Below VAT registration threshold (estimate)",
      passed:
        !profile?.vatRegistered &&
        annualRevenue < rules.vat_annual_threshold,
      severity:
        !profile?.vatRegistered &&
        annualRevenue >= rules.vat_annual_threshold * 0.85
          ? "warn"
          : "ok",
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return { score, checks };
}

export async function generateTaxInsights(
  businessId: string
): Promise<TaxInsight[]> {
  const insights: TaxInsight[] = [];
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  const [
    profile,
    rules,
    recentSales,
    recentExpenses,
    priorExpenses,
    stockReductions,
    ytdRevenue,
  ] = await Promise.all([
    prisma.businessTaxProfile.findUnique({ where: { businessId } }),
    getActiveTaxRules("NG"),
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        businessId,
        date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),
    prisma.stockAdjustment.aggregate({
      where: {
        businessId,
        type: { in: ["SALE", "DAMAGE", "THEFT", "EXPIRED"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { quantity: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        createdAt: { gte: new Date(now.getFullYear(), 0, 1), lte: now },
      },
      _sum: { total: true },
    }),
  ]);

  const annualRevenue = Number(ytdRevenue._sum.total ?? 0);
  const monthRevenue = Number(recentSales._sum.total ?? 0);
  const monthExpenses = Number(recentExpenses._sum.amount ?? 0);
  const priorMonthExpenses = Number(priorExpenses._sum.amount ?? 0);

  if (
    !profile?.vatRegistered &&
    annualRevenue >= rules.vat_annual_threshold * 0.85
  ) {
    insights.push({
      id: "vat-threshold",
      type: "warning",
      title: "Revenue approaching VAT threshold (estimate)",
      message:
        "Your recorded revenue is nearing the configured VAT registration threshold. Review your registration status with a tax professional.",
    });
  }

  if (monthRevenue > 0 && monthExpenses < monthRevenue * 0.05) {
    insights.push({
      id: "low-expenses",
      type: "warning",
      title: "Recorded expenses look low",
      message:
        "Expenses are a small share of revenue this month. Recording rent, fuel, and supplies may improve bookkeeping accuracy.",
    });
  }

  if (priorMonthExpenses > 0 && monthExpenses > priorMonthExpenses * 1.35) {
    const pct = Math.round(
      ((monthExpenses - priorMonthExpenses) / priorMonthExpenses) * 100
    );
    insights.push({
      id: "expense-spike",
      type: "info",
      title: `Expenses increased about ${pct}%`,
      message:
        "Review recent expense entries to ensure they are categorized correctly and properly documented.",
    });
  }

  const fuelExpenses = await prisma.expense.findMany({
    where: {
      businessId,
      category: "FUEL",
      date: { gte: thirtyDaysAgo },
    },
    select: { amount: true },
  });
  const priorFuel = await prisma.expense.findMany({
    where: {
      businessId,
      category: "FUEL",
      date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    select: { amount: true },
  });
  const fuelTotal = fuelExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const priorFuelTotal = priorFuel.reduce((s, e) => s + Number(e.amount), 0);
  if (priorFuelTotal > 0 && fuelTotal > priorFuelTotal * 1.25) {
    const pct = Math.round(((fuelTotal - priorFuelTotal) / priorFuelTotal) * 100);
    insights.push({
      id: "fuel-increase",
      type: "info",
      title: `Fuel expenses up ${pct}%`,
      message: "Possible delivery expansion or higher transport costs — verify receipts.",
    });
  }

  const saleQty = Math.abs(Number(stockReductions._sum.quantity ?? 0));
  const saleCount = await prisma.sale.count({
    where: { businessId, createdAt: { gte: thirtyDaysAgo } },
  });
  if (saleQty > 10 && saleCount === 0) {
    insights.push({
      id: "missing-sales",
      type: "warning",
      title: "Inventory moved without recorded sales",
      message:
        "Stock reductions were logged but no sales were recorded in the last 30 days. Check for missing transactions.",
      actionHref: "/sales",
      actionLabel: "Open POS",
    });
  }

  if (!profile?.tin && profile?.registeredBusiness) {
    insights.push({
      id: "missing-tin",
      type: "warning",
      title: "TIN not recorded",
      message:
        "Your profile says the business is registered, but no TIN is saved. Add it in tax settings for better records.",
      actionHref: "/tax/settings",
      actionLabel: "Tax settings",
    });
  }

  if (profile?.vatRegistered && !profile.vatEnabled) {
    insights.push({
      id: "vat-not-enabled",
      type: "warning",
      title: "VAT registered but not applied on sales",
      message:
        "Enable VAT in tax settings if you want invoices to show estimated VAT lines.",
      actionHref: "/tax/settings",
      actionLabel: "Enable VAT",
    });
  }

  const rentRecorded = await prisma.expense.count({
    where: {
      businessId,
      category: "RENT",
      date: { gte: startOfMonth(now), lte: endOfMonth(now) },
    },
  });
  if (rentRecorded === 0 && monthRevenue > 50000) {
    insights.push({
      id: "missing-rent",
      type: "info",
      title: "No rent expense recorded this month",
      message:
        "If you pay shop rent, recording it may improve profit and tax estimate accuracy. Only record genuine, documented expenses.",
      actionHref: "/expenses",
      actionLabel: "Add expense",
    });
  }

  return insights;
}
