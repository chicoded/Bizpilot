import type { LocalProduct } from "@/lib/local-db/types";

export type PlateStepId =
  | "rice"
  | "protein"
  | "extra"
  | "drink"
  | "pay";

export const PLATE_STEPS: {
  id: PlateStepId;
  label: string;
  emoji: string;
  optional?: boolean;
}[] = [
  { id: "rice", label: "Rice", emoji: "🍚" },
  { id: "protein", label: "Protein", emoji: "🍗" },
  { id: "extra", label: "Extra", emoji: "🍌", optional: true },
  { id: "drink", label: "Drink", emoji: "💧", optional: true },
  { id: "pay", label: "Pay", emoji: "₦" },
];

type PlateBucket = "rice" | "protein" | "extra" | "drink" | "other";

function haystack(product: LocalProduct): string {
  return `${product.name} ${product.category ?? ""}`.toLowerCase();
}

/** Heuristic buckets for Nigerian rice / soup street restaurants. */
export function plateBucketForProduct(product: LocalProduct): PlateBucket {
  const h = haystack(product);

  if (
    /\b(coke|fanta|sprite|malt|water|pure\s*water|sachet|drink|juice|soda|beverage)\b/.test(
      h
    ) ||
    /\bdrinks?\b/.test(h)
  ) {
    return "drink";
  }

  if (
    /\b(chicken|fish|turkey|beef|meat|egg|goat|ponmo|protein)\b/.test(h) ||
    /\bproteins?\b/.test(h)
  ) {
    return "protein";
  }

  if (
    /\b(jollof|fried\s*rice|rice\s*&\s*stew|rice\s+and\s+stew|ofada|coconut\s*rice|white\s*rice)\b/.test(
      h
    ) ||
    (/\brice\b/.test(h) && !/\bprotein\b/.test(h))
  ) {
    return "rice";
  }

  if (
    /\b(moi\s*moi|moimoi|plantain|dodo|colslaw|salad|side)\b/.test(h) ||
    /\b(fufu|garri|gari|semo|semolina|pounded\s*yam|amala|soup|egusi|ogbono|vegetable\s*soup|native)\b/.test(
      h
    ) ||
    /\bsides?\b/.test(h)
  ) {
    return "extra";
  }

  const cat = (product.category ?? "").trim().toLowerCase();
  if (cat === "rice") return "rice";
  if (cat === "proteins" || cat === "protein") return "protein";
  if (cat === "drinks" || cat === "drink") return "drink";
  if (cat === "sides" || cat === "side" || cat === "swallow" || cat === "soup") {
    return "extra";
  }

  return "other";
}

export function productsForPlateStep(
  products: LocalProduct[],
  step: PlateStepId
): LocalProduct[] {
  if (step === "pay") return [];
  const bucket =
    step === "rice"
      ? "rice"
      : step === "protein"
        ? "protein"
        : step === "extra"
          ? "extra"
          : "drink";

  const matched = products.filter((p) => plateBucketForProduct(p) === bucket);
  if (matched.length > 0) return matched;

  // Soft fallback: show unmatched items on extras so staff can still sell.
  if (step === "extra") {
    return products.filter((p) => plateBucketForProduct(p) === "other");
  }
  return [];
}

export function suggestRiceShopCategories(): string[] {
  return ["Rice", "Proteins", "Sides", "Swallow", "Soup", "Drinks"];
}

export function suggestRiceShopComboNames(): string[] {
  return [
    "Jollof + Chicken",
    "Jollof + Fish",
    "Fried Rice + Chicken",
    "Rice & Stew + Egg",
    "Swallow + Soup",
    "Student Plate",
  ];
}
