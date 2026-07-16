import type { Industry } from "@prisma/client";

export const RUSH_POS_INDUSTRIES: Industry[] = [
  "RESTAURANT",
  "FAST_FOOD",
  "CAFE",
];

export function isRushPosIndustry(industry: string | Industry | null | undefined) {
  return RUSH_POS_INDUSTRIES.includes(industry as Industry);
}

export function shouldUseRushPos(
  industry: string | Industry | null | undefined,
  settings?: { rushModeEnabled: boolean } | null
) {
  if (settings) return settings.rushModeEnabled;
  return isRushPosIndustry(industry);
}

/** Default category chips for restaurant menus (matched case-insensitively). */
export const RUSH_CATEGORY_PRESETS = [
  "Favorites",
  "Combos",
  "Rice",
  "Proteins",
  "Drinks",
  "Sides",
  "Desserts",
  "Breakfast",
  "Snacks",
  "Specials",
] as const;

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
