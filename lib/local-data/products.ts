import { getLocalDB } from "@/lib/local-db/database";
import type { LocalProduct, LocalRecipeLine } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";
import {
  defaultTracksStock,
  normalizeProductType,
  type ProductTypeValue,
} from "@/lib/product-types";

export type ProductInput = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  productType?: ProductTypeValue | string | null;
  description?: string | null;
  unit?: string | null;
  prepTimeMinutes?: number | null;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  tracksStock?: boolean;
  recipeLines?: LocalRecipeLine[];
  purchasePrice: number;
  sellingPrice: number;
  unitsPerPack?: number;
  quantity: number;
  reorderLevel: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  imageUrl?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export async function listLocalProducts(
  businessId: string
): Promise<LocalProduct[]> {
  const db = getLocalDB();
  const products = await db.products.where("businessId").equals(businessId).toArray();
  return products.filter((p) => p.isActive).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalProduct(
  businessId: string,
  productId: string
): Promise<LocalProduct | undefined> {
  const db = getLocalDB();
  const product = await db.products.get(productId);
  if (!product || product.businessId !== businessId || !product.isActive) {
    return undefined;
  }
  return product;
}

export async function createLocalProduct(
  businessId: string,
  input: ProductInput
): Promise<LocalProduct> {
  const db = getLocalDB();
  const timestamp = nowIso();
  const productType = normalizeProductType(input.productType);
  const tracksStock =
    input.tracksStock ?? defaultTracksStock(productType);

  const product: LocalProduct = {
    id: localId("prod"),
    businessId,
    name: input.name.trim(),
    sku: input.sku?.trim() || null,
    barcode: input.barcode?.trim() || null,
    category: input.category?.trim() || null,
    productType,
    description: input.description?.trim() || null,
    unit: input.unit?.trim() || null,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    isPopular: Boolean(input.isPopular),
    isChefSpecial: Boolean(input.isChefSpecial),
    tracksStock,
    recipeLines: input.recipeLines ?? [],
    purchasePrice: input.purchasePrice,
    sellingPrice: input.sellingPrice,
    unitsPerPack: input.unitsPerPack ?? 1,
    quantity: tracksStock ? input.quantity : 0,
    reorderLevel: input.reorderLevel,
    batchNumber: input.batchNumber?.trim() || null,
    expiryDate: input.expiryDate || null,
    imageUrl: input.imageUrl ?? null,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.products.put(product);
  const { notifyLocalDataChanged } = await import("@/lib/sync/events");
  notifyLocalDataChanged("products");

  if (typeof navigator !== "undefined" && navigator.onLine) {
    void import("@/lib/sync/products-sync")
      .then(({ pushLocalProducts }) => pushLocalProducts(businessId))
      .catch(() => null);
  }

  return product;
}

export async function updateLocalProduct(
  businessId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<LocalProduct | null> {
  const existing = await getLocalProduct(businessId, productId);
  if (!existing) return null;

  const productType = normalizeProductType(
    input.productType ?? existing.productType
  );
  const tracksStock =
    input.tracksStock ??
    existing.tracksStock ??
    defaultTracksStock(productType);

  const updated: LocalProduct = {
    ...existing,
    ...input,
    name: input.name?.trim() ?? existing.name,
    sku: input.sku !== undefined ? input.sku?.trim() || null : existing.sku,
    barcode:
      input.barcode !== undefined
        ? input.barcode?.trim() || null
        : existing.barcode,
    category:
      input.category !== undefined
        ? input.category?.trim() || null
        : existing.category,
    productType,
    description:
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description ?? null,
    unit:
      input.unit !== undefined ? input.unit?.trim() || null : existing.unit ?? null,
    prepTimeMinutes:
      input.prepTimeMinutes !== undefined
        ? input.prepTimeMinutes
        : existing.prepTimeMinutes ?? null,
    isPopular:
      input.isPopular !== undefined ? input.isPopular : Boolean(existing.isPopular),
    isChefSpecial:
      input.isChefSpecial !== undefined
        ? input.isChefSpecial
        : Boolean(existing.isChefSpecial),
    tracksStock,
    recipeLines:
      input.recipeLines !== undefined
        ? input.recipeLines
        : existing.recipeLines ?? [],
    unitsPerPack: input.unitsPerPack ?? existing.unitsPerPack,
    updatedAt: nowIso(),
    syncedAt: null,
  };

  await getLocalDB().products.put(updated);
  const { notifyLocalDataChanged } = await import("@/lib/sync/events");
  notifyLocalDataChanged("products");

  if (typeof navigator !== "undefined" && navigator.onLine) {
    void import("@/lib/sync/products-sync")
      .then(({ pushLocalProducts }) => pushLocalProducts(businessId))
      .catch(() => null);
  }

  return updated;
}

export async function deleteLocalProduct(
  businessId: string,
  productId: string
): Promise<boolean> {
  const existing = await getLocalProduct(businessId, productId);
  if (!existing) return false;

  await getLocalDB().products.put({
    ...existing,
    isActive: false,
    sku: null,
    barcode: null,
    imageUrl: null,
    updatedAt: nowIso(),
    syncedAt: null,
  });
  const { notifyLocalDataChanged } = await import("@/lib/sync/events");
  notifyLocalDataChanged("products");

  if (typeof navigator !== "undefined" && navigator.onLine) {
    void import("@/lib/sync/products-sync")
      .then(({ pushLocalProducts }) => pushLocalProducts(businessId))
      .catch(() => null);
  }

  return true;
}

export async function replaceLocalProducts(
  businessId: string,
  products: LocalProduct[]
): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.products, async () => {
    const existing = await db.products.where({ businessId }).toArray();
    const incomingIds = new Set(products.map((p) => p.id));
    const toDelete = existing.filter((p) => !incomingIds.has(p.id));
    if (toDelete.length > 0) {
      await db.products.bulkDelete(toDelete.map((p) => p.id));
    }
    if (products.length > 0) {
      await db.products.bulkPut(products);
    }
  });
}

export async function searchLocalProducts(
  businessId: string,
  query: string
): Promise<LocalProduct[]> {
  const q = query.trim().toLowerCase();
  const products = await listLocalProducts(businessId);
  if (!q) return products;

  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode?.toLowerCase().includes(q) ?? false) ||
      (p.sku?.toLowerCase().includes(q) ?? false) ||
      (p.category?.toLowerCase().includes(q) ?? false)
  );
}

export async function getLocalProductByBarcode(
  businessId: string,
  barcode: string
): Promise<LocalProduct | undefined> {
  const code = barcode.trim();
  if (!code) return undefined;

  const db = getLocalDB();
  const matches = await db.products
    .where("businessId")
    .equals(businessId)
    .filter((p) => p.isActive && p.barcode === code)
    .toArray();

  return matches[0];
}
