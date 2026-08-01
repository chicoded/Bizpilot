import type { Industry } from "@prisma/client";
import { foodServicePack } from "@/lib/industries/packs";
import { hasCapability } from "@/lib/industries";

export const RUSH_POS_INDUSTRIES: readonly Industry[] = foodServicePack.industries;

/** Now a capability question, not a list of trade names. */
export function isRushPosIndustry(industry: string | Industry | null | undefined) {
  return hasCapability(industry, "rush_pos");
}

export function shouldUseRushPos(
  industry: string | Industry | null | undefined,
  settings?: { rushModeEnabled: boolean } | null
) {
  if (settings) return settings.rushModeEnabled;
  return isRushPosIndustry(industry);
}

/** Default category chips for restaurant menus (matched case-insensitively). */
export const RUSH_CATEGORY_PRESETS = foodServicePack.categoryPresets;

export const QUICK_NOTE_CHIPS = [
  "No Pepper",
  "Extra Pepper",
  "No Onion",
  "Extra Chicken",
  "Takeaway",
  "Eat In",
  "Delivery",
] as const;

export const SERVICE_TYPES = [
  { value: "WALK_IN", label: "Walk In" },
  { value: "DINE_IN", label: "Dine In" },
  { value: "PICKUP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
] as const;

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number]["value"];
