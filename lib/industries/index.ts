import type { Industry } from "@prisma/client";
import type { AppSectionId } from "@/lib/permissions";
import { ALL_PACKS, FALLBACK_PACK } from "./packs";
import {
  collectAttributeInput,
  parseAttributes,
  type AttributeParseResult,
  type AttributeValue,
} from "./attributes";
import type { AttributeField, Capability, IndustryPack } from "./types";

export type { AttributeField, Capability, IndustryPack } from "./types";
export type { AttributeParseResult, AttributeValue } from "./attributes";
export { ALL_PACKS, FALLBACK_PACK } from "./packs";
export {
  ATTRIBUTE_FIELD_PREFIX,
  attributeInputName,
  buildAttributeSchema,
  collectAttributeInput,
  parseAttributes,
} from "./attributes";

type IndustryKey = Industry | string | null | undefined;

const BY_INDUSTRY = new Map<string, IndustryPack>(
  ALL_PACKS.flatMap((pack) =>
    pack.industries.map((industry) => [industry as string, pack] as const)
  )
);

/** The pack serving this trade, or general retail when unrecognised. */
export function getIndustryPack(industry: IndustryKey): IndustryPack {
  if (!industry) return FALLBACK_PACK;
  return BY_INDUSTRY.get(industry) ?? FALLBACK_PACK;
}

/**
 * Ask what a business can do, never what it is called. Feature code should
 * reach for this instead of comparing industry values.
 */
export function hasCapability(
  industry: IndustryKey,
  capability: Capability
): boolean {
  return getIndustryPack(industry).capabilities.includes(capability);
}

export function categoryPresets(industry: IndustryKey): readonly string[] {
  return getIndustryPack(industry).categoryPresets;
}

export function productNoun(industry: IndustryKey) {
  return getIndustryPack(industry).productNoun;
}

export function posMode(industry: IndustryKey): IndustryPack["posMode"] {
  return getIndustryPack(industry).posMode;
}

/** Extra product fields for this trade — drives both the form and the validator. */
export function productAttributeFields(
  industry: IndustryKey
): readonly AttributeField[] {
  return getIndustryPack(industry).productAttributes;
}

/** Validates product attributes against whatever this trade declares. */
export function parseProductAttributes(
  industry: IndustryKey,
  raw: unknown
): AttributeParseResult {
  return parseAttributes(productAttributeFields(industry), raw);
}

/** Reads this trade's attribute inputs out of a form submission. */
export function collectProductAttributes(
  industry: IndustryKey,
  read: (inputName: string) => unknown
): Record<string, unknown> {
  return collectAttributeInput(productAttributeFields(industry), read);
}

/**
 * Full form-to-storage path: read the declared inputs, validate them, and hand
 * back something safe to write into `Product.attributes`.
 *
 * Trades with no declared fields get `undefined` so the column is left alone
 * rather than filled with an empty object.
 */
export function readProductAttributesFromForm(
  industry: IndustryKey,
  read: (inputName: string) => unknown
):
  | { success: true; attributes: Record<string, AttributeValue> | undefined }
  | { success: false; errors: Record<string, string>; message: string } {
  const fields = productAttributeFields(industry);
  if (fields.length === 0) return { success: true, attributes: undefined };

  const parsed = parseAttributes(fields, collectProductAttributes(industry, read));

  if (!parsed.success) {
    const labelFor = new Map(fields.map((field) => [field.name, field.label]));
    const message = Object.entries(parsed.errors)
      .map(([name, error]) => `${labelFor.get(name) ?? name}: ${error}`)
      .join(". ");
    return { success: false, errors: parsed.errors, message };
  }

  return { success: true, attributes: parsed.data };
}

/**
 * Drops nav entries this trade has no use for, in both directions: sections a
 * pack hides, and sections that exist only for a capability it doesn't declare.
 *
 * Role filtering runs separately and both only ever remove, so the order they
 * run in doesn't matter.
 */
export function filterNavItemsByIndustry<
  T extends { href: string; requiresCapability?: Capability },
>(
  items: T[],
  industry: IndustryKey,
  sectionForHref?: (href: string) => AppSectionId | null
): T[] {
  const pack = getIndustryPack(industry);
  const hidden = pack.hiddenSections;

  return items.filter((item) => {
    if (item.requiresCapability && !pack.capabilities.includes(item.requiresCapability)) {
      return false;
    }
    if (!hidden || hidden.length === 0 || !sectionForHref) return true;
    const section = sectionForHref(item.href);
    if (!section) return true;
    return !hidden.includes(section);
  });
}
