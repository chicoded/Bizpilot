export type TaxInsight = {
  id: string;
  type: "info" | "warning" | "danger";
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export type TaxDashboardData = {
  profileComplete: boolean;
  today: {
    revenue: number;
    vatCollected: number;
    profit: number;
    estimatedTax: number;
    vatEnabled: boolean;
    vatRate: number;
  };
  monthly: {
    estimatedRevenue: number;
    estimatedExpenses: number;
    estimatedProfit: number;
    estimatedVATCollected: number;
    estimatedTax: number;
    confidence: number;
  } | null;
  forecast: {
    projectedAnnualRevenue: number;
    projectedAnnualProfit: number;
    projectedAnnualTax: number;
    ytdRevenue: number;
    vatThreshold: number;
  };
  compliance: {
    score: number;
    checks: { id: string; label: string; passed: boolean; severity: string }[];
  };
  insights: TaxInsight[];
};

export type TaxProfileInput = {
  businessType: string;
  state: string;
  registeredBusiness: boolean;
  tin?: string;
  vatRegistered: boolean;
  vatEnabled: boolean;
  vatPricingMode: "INCLUSIVE" | "EXCLUSIVE";
  annualRevenueBand: string;
};
