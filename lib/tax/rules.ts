import { prisma } from "@/lib/db";
import {
  DEFAULT_TAX_RULES,
  type TaxRuleKey,
  type TaxRulesMap,
} from "@/lib/tax/constants";

const RULE_KEYS: TaxRuleKey[] = [
  "vat_rate",
  "vat_annual_threshold",
  "cit_company_rate",
  "presumptive_tax_rate",
  "development_levy_rate",
];

export async function getActiveTaxRules(
  countryCode = "NG"
): Promise<TaxRulesMap> {
  try {
    const rows = await prisma.taxRuleConfig.findMany({
      where: { countryCode, isActive: true, ruleKey: { in: RULE_KEYS } },
    });

    const rules = { ...DEFAULT_TAX_RULES };
    for (const row of rows) {
      const key = row.ruleKey as TaxRuleKey;
      if (RULE_KEYS.includes(key)) {
        rules[key] = Number(row.value);
      }
    }
    return rules;
  } catch {
    return { ...DEFAULT_TAX_RULES };
  }
}

export async function ensureDefaultTaxRules(countryCode = "NG") {
  const existing = await prisma.taxRuleConfig.count({ where: { countryCode } });
  if (existing > 0) return;

  const now = new Date();
  await prisma.taxRuleConfig.createMany({
    data: RULE_KEYS.map((ruleKey) => ({
      id: `tax_${countryCode.toLowerCase()}_${ruleKey}`,
      countryCode,
      ruleKey,
      value: DEFAULT_TAX_RULES[ruleKey],
      label: ruleKey.replace(/_/g, " "),
      description: "Default estimate — update when regulations change",
      updatedAt: now,
    })),
    skipDuplicates: true,
  });
}
