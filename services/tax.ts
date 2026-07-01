import { prisma } from "@/lib/db";
import {
  getTodayTaxSnapshot,
  getTaxForecast,
  recalculateTaxEstimate,
} from "@/lib/tax/engine";
import {
  calculateComplianceScore,
  generateTaxInsights,
} from "@/lib/tax/insights";
import { ensureDefaultTaxRules } from "@/lib/tax/rules";
import type { TaxDashboardData } from "@/types/tax";

export async function getTaxDashboard(
  businessId: string
): Promise<TaxDashboardData> {
  await ensureDefaultTaxRules("NG");

  const [profile, today, forecast, compliance, insights, monthly] =
    await Promise.all([
      prisma.businessTaxProfile.findUnique({ where: { businessId } }),
      getTodayTaxSnapshot(businessId),
      getTaxForecast(businessId),
      calculateComplianceScore(businessId),
      generateTaxInsights(businessId),
      recalculateTaxEstimate(businessId),
    ]);

  const profileComplete = Boolean(
    profile?.state && profile.businessType && profile.annualRevenueBand
  );

  return {
    profileComplete,
    today,
    monthly: monthly
      ? {
          estimatedRevenue: Number(monthly.estimatedRevenue),
          estimatedExpenses: Number(monthly.estimatedExpenses),
          estimatedProfit: Number(monthly.estimatedProfit),
          estimatedVATCollected: Number(monthly.estimatedVATCollected),
          estimatedTax: Number(monthly.estimatedTax),
          confidence: monthly.confidence,
        }
      : null,
    forecast: {
      projectedAnnualRevenue: forecast.projectedAnnualRevenue,
      projectedAnnualProfit: forecast.projectedAnnualProfit,
      projectedAnnualTax: forecast.projectedAnnualTax,
      ytdRevenue: forecast.ytdRevenue,
      vatThreshold: forecast.vatThreshold,
    },
    compliance,
    insights,
  };
}

export async function ensureTaxProfile(businessId: string) {
  return prisma.businessTaxProfile.upsert({
    where: { businessId },
    create: { businessId },
    update: {},
  });
}
