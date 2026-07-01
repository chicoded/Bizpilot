-- Tax & Compliance module (configurable rules — update rates here, not in app code)

CREATE TYPE "VatPricingMode" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');
CREATE TYPE "TaxBusinessType" AS ENUM ('RETAIL', 'PHARMACY', 'RESTAURANT', 'ELECTRONICS', 'FASHION', 'SERVICES', 'OTHER');

CREATE TABLE IF NOT EXISTS "tax_rule_configs" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL DEFAULT 'NG',
  "ruleKey" TEXT NOT NULL,
  "value" DECIMAL(14,6) NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_rule_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_rule_configs_countryCode_ruleKey_key"
  ON "tax_rule_configs"("countryCode", "ruleKey");

CREATE TABLE IF NOT EXISTS "business_tax_profiles" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessType" "TaxBusinessType" NOT NULL DEFAULT 'OTHER',
  "state" TEXT,
  "registeredBusiness" BOOLEAN NOT NULL DEFAULT false,
  "tin" TEXT,
  "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
  "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
  "vatPricingMode" "VatPricingMode" NOT NULL DEFAULT 'EXCLUSIVE',
  "annualRevenueBand" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_tax_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_tax_profiles_businessId_key"
  ON "business_tax_profiles"("businessId");

ALTER TABLE "business_tax_profiles"
  ADD CONSTRAINT "business_tax_profiles_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "tax_estimates" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "estimatedRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "estimatedExpenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "estimatedProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "estimatedVATCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "estimatedTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "confidence" INTEGER NOT NULL DEFAULT 70,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_estimates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_estimates_businessId_month_year_key"
  ON "tax_estimates"("businessId", "month", "year");

CREATE INDEX IF NOT EXISTS "tax_estimates_businessId_idx" ON "tax_estimates"("businessId");

ALTER TABLE "tax_estimates"
  ADD CONSTRAINT "tax_estimates_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nigeria default rule estimates (update when regulations change)
INSERT INTO "tax_rule_configs" ("id", "countryCode", "ruleKey", "value", "label", "description", "updatedAt")
VALUES
  ('tax_ng_vat_rate', 'NG', 'vat_rate', 0.075, 'VAT rate', 'Standard VAT rate estimate for Nigeria', NOW()),
  ('tax_ng_vat_threshold', 'NG', 'vat_annual_threshold', 25000000, 'VAT registration threshold', 'Annual turnover guidance threshold (NGN)', NOW()),
  ('tax_ng_cit_rate', 'NG', 'cit_company_rate', 0.30, 'Company income tax rate', 'Estimated CIT rate for registered companies', NOW()),
  ('tax_ng_presumptive_rate', 'NG', 'presumptive_tax_rate', 0.03, 'Presumptive tax rate', 'Rough monthly estimate for unregistered micro businesses', NOW()),
  ('tax_ng_development_levy', 'NG', 'development_levy_rate', 0.04, 'Development levy', 'Additional levy estimate on taxable profit', NOW())
ON CONFLICT ("countryCode", "ruleKey") DO UPDATE SET
  "value" = EXCLUDED."value",
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = NOW();
