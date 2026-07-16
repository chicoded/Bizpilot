export const PRODUCT_TYPES = [
  {
    value: "MENU_ITEM",
    label: "Menu Item",
    emoji: "🍔",
    description: "Prepared food with a recipe",
  },
  {
    value: "READY_MADE",
    label: "Ready-made",
    emoji: "🥤",
    description: "Bottled drinks, snacks, packaged goods",
  },
  {
    value: "INGREDIENT",
    label: "Ingredient",
    emoji: "🥩",
    description: "Raw materials used in recipes",
  },
  {
    value: "PACKAGING",
    label: "Packaging",
    emoji: "📦",
    description: "Boxes, spoons, bags, cups",
  },
] as const;

export type ProductTypeValue = (typeof PRODUCT_TYPES)[number]["value"];

export const RECIPE_COMPONENT_TYPES: ProductTypeValue[] = [
  "INGREDIENT",
  "PACKAGING",
];

export const POS_SELLABLE_TYPES: ProductTypeValue[] = [
  "MENU_ITEM",
  "READY_MADE",
];

export function normalizeProductType(
  value: string | null | undefined
): ProductTypeValue {
  if (
    value === "MENU_ITEM" ||
    value === "READY_MADE" ||
    value === "INGREDIENT" ||
    value === "PACKAGING" ||
    value === "SERVICE"
  ) {
    if (value === "SERVICE") return "READY_MADE";
    return value;
  }
  return "READY_MADE";
}

export function isPosSellableType(type: string | null | undefined): boolean {
  return POS_SELLABLE_TYPES.includes(normalizeProductType(type));
}

export function isRecipeComponentType(type: string | null | undefined): boolean {
  return RECIPE_COMPONENT_TYPES.includes(normalizeProductType(type));
}

export function defaultTracksStock(type: ProductTypeValue): boolean {
  return type !== "MENU_ITEM";
}

export function productTypeLabel(type: string | null | undefined): string {
  const normalized = normalizeProductType(type);
  return PRODUCT_TYPES.find((t) => t.value === normalized)?.label ?? "Product";
}

/** Hybrid type picker is available to every shop (classification system). */
export function usesHybridInventory(_industry?: string | null): boolean {
  return true;
}
