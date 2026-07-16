import type { LocalProduct, LocalSale } from "@/lib/local-db/types";

/**
 * Adaptive POS: rank products by how often they sell in the current daypart.
 * No owner config — learns from local sales patterns.
 */
export function currentDaypart(now = new Date()): "breakfast" | "lunch" | "dinner" | "late" {
  const hour = now.getHours();
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "late";
}

function saleInCurrentDaypart(sale: LocalSale, now = new Date()) {
  const part = currentDaypart(now);
  const hour = new Date(sale.createdAt).getHours();
  if (part === "breakfast") return hour >= 6 && hour < 11;
  if (part === "lunch") return hour >= 11 && hour < 16;
  if (part === "dinner") return hour >= 16 && hour < 22;
  return hour < 6 || hour >= 22;
}

export function adaptiveProductRank(
  products: LocalProduct[],
  sales: LocalSale[],
  options?: { favoriteIds?: Set<string>; now?: Date }
): LocalProduct[] {
  const now = options?.now ?? new Date();
  const scores = new Map<string, number>();

  for (const sale of sales) {
    const inPart = saleInCurrentDaypart(sale, now);
    const weight = inPart ? 5 : 1;
    for (const item of sale.items) {
      scores.set(item.productId, (scores.get(item.productId) ?? 0) + item.quantity * weight);
    }
  }

  return [...products].sort((a, b) => {
    const favA = options?.favoriteIds?.has(a.id) ? 1 : 0;
    const favB = options?.favoriteIds?.has(b.id) ? 1 : 0;
    if (favA !== favB) return favB - favA;
    const scoreDiff = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

/** Suggest upsell products based on co-occurrence in past sales. */
export function suggestUpsells(
  cartProductIds: string[],
  sales: LocalSale[],
  products: LocalProduct[],
  limit = 3
): LocalProduct[] {
  if (cartProductIds.length === 0) return [];
  const cartSet = new Set(cartProductIds);
  const scores = new Map<string, number>();

  for (const sale of sales) {
    const ids = sale.items.map((i) => i.productId);
    if (!ids.some((id) => cartSet.has(id))) continue;
    for (const id of ids) {
      if (cartSet.has(id)) continue;
      scores.set(id, (scores.get(id) ?? 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => products.find((p) => p.id === id))
    .filter((p): p is LocalProduct => p != null && p.quantity > 0)
    .slice(0, limit);
}
