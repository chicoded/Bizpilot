import { getLocalDB } from "@/lib/local-db/database";
import type { LocalProduct } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";

export type ProductInput = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
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

  const product: LocalProduct = {
    id: localId("prod"),
    businessId,
    name: input.name.trim(),
    sku: input.sku?.trim() || null,
    barcode: input.barcode?.trim() || null,
    category: input.category?.trim() || null,
    purchasePrice: input.purchasePrice,
    sellingPrice: input.sellingPrice,
    unitsPerPack: input.unitsPerPack ?? 1,
    quantity: input.quantity,
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
  return product;
}

export async function updateLocalProduct(
  businessId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<LocalProduct | null> {
  const existing = await getLocalProduct(businessId, productId);
  if (!existing) return null;

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
    unitsPerPack: input.unitsPerPack ?? existing.unitsPerPack,
    updatedAt: nowIso(),
    syncedAt: null,
  };

  await getLocalDB().products.put(updated);
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
