import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import type { ProductApiItem } from "@/types";

/** Quick-pick grid size — 8 tiles = 4 rows × 2 cols on mobile */
export const POS_QUICK_PICK_LIMIT = 8;

/** Max products shown when searching the full catalog */
export const POS_SEARCH_LIMIT = 20;

const SALES_LOOKBACK_DAYS = 30;

const productApiSelect = {
  id: true,
  name: true,
  sellingPrice: true,
  quantity: true,
  barcode: true,
} as const;

function normalizeProduct(product: {
  id: string;
  name: string;
  sellingPrice: { toString(): string } | number;
  quantity: number;
  barcode: string | null;
}): ProductApiItem {
  return {
    id: product.id,
    name: product.name,
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    barcode: product.barcode ?? null,
    imageUrl: null,
  };
}

async function loadProductsByIds(
  businessId: string,
  ids: string[]
): Promise<ProductApiItem[]> {
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      id: { in: ids },
    },
    select: productApiSelect,
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(normalizeProduct);
}

/**
 * Top sellers from the last 30 days, in stock first.
 * Fills remaining slots with other in-stock products (A–Z) for new businesses.
 */
export async function getPosQuickPickProducts(
  businessId: string,
  limit = POS_QUICK_PICK_LIMIT
): Promise<{ products: ProductApiItem[]; totalInStock: number }> {
  const since = subDays(new Date(), SALES_LOOKBACK_DAYS);

  const [topSold, totalInStock] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: { businessId, createdAt: { gte: since } },
        product: { isActive: true, quantity: { gt: 0 } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    }),
    prisma.product.count({
      where: { businessId, isActive: true, quantity: { gt: 0 } },
    }),
  ]);

  const topIds = topSold.map((row) => row.productId);
  const quickProducts = await loadProductsByIds(businessId, topIds);

  if (quickProducts.length >= limit) {
    return { products: quickProducts.slice(0, limit), totalInStock };
  }

  const fillers = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      quantity: { gt: 0 },
      ...(topIds.length > 0 ? { id: { notIn: topIds } } : {}),
    },
    orderBy: { name: "asc" },
    take: limit - quickProducts.length,
    select: productApiSelect,
  });

  return {
    products: [...quickProducts, ...fillers.map(normalizeProduct)],
    totalInStock,
  };
}

export async function searchProductsForPos(
  businessId: string,
  query: string,
  limit = POS_SEARCH_LIMIT
): Promise<ProductApiItem[]> {
  const term = query.trim();
  if (!term) return [];

  const products = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term } },
        { sku: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ quantity: "desc" }, { name: "asc" }],
    take: limit,
    select: productApiSelect,
  });

  return products.map(normalizeProduct);
}
