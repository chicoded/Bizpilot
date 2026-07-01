export const TAX_DISCLAIMER =
  "These calculations are estimates generated from your business records. They are not official tax filings or legal advice. Consult a qualified tax professional or the relevant government authority for official guidance.";

export const TAX_DISCLAIMER_SHORT =
  "Estimates only — not legal or tax advice.";

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export const ANNUAL_REVENUE_BANDS = [
  { value: "under_25m", label: "Under ₦25 million" },
  { value: "25m_to_100m", label: "₦25M – ₦100M" },
  { value: "over_100m", label: "Over ₦100 million" },
] as const;

export const TAX_BUSINESS_TYPE_LABELS: Record<string, string> = {
  RETAIL: "Retail",
  PHARMACY: "Pharmacy",
  RESTAURANT: "Restaurant",
  ELECTRONICS: "Electronics",
  FASHION: "Fashion",
  SERVICES: "Services",
  OTHER: "Other",
};

export type TaxRuleKey =
  | "vat_rate"
  | "vat_annual_threshold"
  | "cit_company_rate"
  | "presumptive_tax_rate"
  | "development_levy_rate";

export type TaxRulesMap = Record<TaxRuleKey, number>;

export const DEFAULT_TAX_RULES: TaxRulesMap = {
  vat_rate: 0.075,
  vat_annual_threshold: 25_000_000,
  cit_company_rate: 0.3,
  presumptive_tax_rate: 0.03,
  development_levy_rate: 0.04,
};
