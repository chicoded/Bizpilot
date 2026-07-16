import { notifyLocalDataChanged } from "@/lib/sync/events";
import type { LocalProduct } from "@/lib/local-db/types";

export type ProductPushResult = {
  ok: boolean;
  pushed: number;
  message: string;
};

export type ProductPullResult = {
  ok: boolean;
  updated: number;
  added: number;
  message: string;
};

export type CloudProductRow = {
  id: string;
  name: string;
  sellingPrice: number;
  purchasePrice?: number;
  quantity: number;
  barcode?: string | null;
  category?: string | null;
  productType?: string | null;
  description?: string | null;
  unit?: string | null;
  prepTimeMinutes?: number | null;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  tracksStock?: boolean;
  recipeLines?: { componentId: string; quantity: number }[];
  reorderLevel?: number;
  unitsPerPack?: number;
  sku?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
};

async function listUnsyncedLocalProducts(
  businessId: string
): Promise<LocalProduct[]> {
  const { getLocalDB } = await import("@/lib/local-db/database");
  const db = getLocalDB();
  const rows = await db.products.where("businessId").equals(businessId).toArray();
  return rows.filter((p) => p.syncedAt == null);
}

function mapCloudToLocal(
  businessId: string,
  product: CloudProductRow,
  timestamp: string,
  existing?: LocalProduct
): LocalProduct {
  return {
    id: product.id,
    businessId,
    name: product.name,
    sku: product.sku ?? existing?.sku ?? null,
    barcode: product.barcode ?? existing?.barcode ?? null,
    category: product.category ?? existing?.category ?? null,
    productType: product.productType ?? existing?.productType ?? "READY_MADE",
    description: product.description ?? existing?.description ?? null,
    unit: product.unit ?? existing?.unit ?? null,
    prepTimeMinutes:
      product.prepTimeMinutes ?? existing?.prepTimeMinutes ?? null,
    isPopular: product.isPopular ?? existing?.isPopular ?? false,
    isChefSpecial: product.isChefSpecial ?? existing?.isChefSpecial ?? false,
    tracksStock: product.tracksStock ?? existing?.tracksStock ?? true,
    recipeLines: product.recipeLines ?? existing?.recipeLines ?? [],
    purchasePrice: Number(product.purchasePrice ?? existing?.purchasePrice ?? 0),
    sellingPrice: Number(product.sellingPrice),
    unitsPerPack: product.unitsPerPack ?? existing?.unitsPerPack ?? 1,
    quantity: product.quantity,
    reorderLevel: product.reorderLevel ?? existing?.reorderLevel ?? 5,
    batchNumber: existing?.batchNumber ?? null,
    expiryDate: existing?.expiryDate ?? null,
    imageUrl: product.imageUrl ?? existing?.imageUrl ?? null,
    isActive: product.isActive !== false,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    syncedAt: timestamp,
  };
}

async function fetchCloudProducts(): Promise<CloudProductRow[] | null> {
  const response = await fetch("/api/products?sync=1", { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as {
    products?: CloudProductRow[];
    error?: string;
  } | null;

  if (!response.ok) {
    console.warn("[pullCloudProducts]", response.status, data?.error);
    return null;
  }
  return Array.isArray(data?.products) ? data.products : [];
}

/** Push local-only / edited products into the shared team database. */
export async function pushLocalProducts(
  businessId: string
): Promise<ProductPushResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: true,
      pushed: 0,
      message: "Offline — products stay on this device until online",
    };
  }

  const unsynced = await listUnsyncedLocalProducts(businessId);
  if (unsynced.length === 0) {
    return { ok: true, pushed: 0, message: "All products already on team database" };
  }

  try {
    const response = await fetch("/api/sync/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: unsynced.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category: p.category,
          productType: p.productType ?? "READY_MADE",
          description: p.description ?? null,
          unit: p.unit ?? null,
          prepTimeMinutes: p.prepTimeMinutes ?? null,
          isPopular: Boolean(p.isPopular),
          isChefSpecial: Boolean(p.isChefSpecial),
          tracksStock: p.tracksStock !== false,
          recipeLines: p.recipeLines ?? [],
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          unitsPerPack: p.unitsPerPack,
          quantity: p.quantity,
          reorderLevel: p.reorderLevel,
          batchNumber: p.batchNumber,
          expiryDate: p.expiryDate,
          imageUrl: p.imageUrl,
          isActive: p.isActive,
          updatedAt: p.updatedAt,
        })),
      }),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      upserted?: number;
      ids?: string[];
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        pushed: 0,
        message: data.error ?? "Could not upload products to team database",
      };
    }

    const ids = new Set(data.ids ?? []);
    const timestamp = new Date().toISOString();
    const { getLocalDB } = await import("@/lib/local-db/database");
    const db = getLocalDB();

    await db.transaction("rw", db.products, async () => {
      for (const id of ids) {
        const existing = await db.products.get(id);
        if (existing && existing.businessId === businessId) {
          await db.products.put({
            ...existing,
            syncedAt: timestamp,
          });
        }
      }
    });

    const pushed = data.upserted ?? ids.size;
    return {
      ok: Boolean(data.ok),
      pushed,
      message:
        pushed > 0
          ? `Shared ${pushed} product(s) with team`
          : "No products uploaded",
    };
  } catch {
    return {
      ok: false,
      pushed: 0,
      message: "Could not upload products to team database",
    };
  }
}

/**
 * Merge team catalog into local IndexedDB.
 * Cloud is source of truth for shared products (name, price, stock).
 * Keeps local-only rows that have not been uploaded yet.
 */
export async function pullCloudProducts(
  businessId: string,
  options?: { forceReplace?: boolean }
): Promise<ProductPullResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true, updated: 0, added: 0, message: "Offline — using local stock" };
  }

  try {
    const cloudProducts = await fetchCloudProducts();
    if (!cloudProducts) {
      return {
        ok: false,
        updated: 0,
        added: 0,
        message: "Could not refresh team stock (check shop access)",
      };
    }

    if (!cloudProducts.length) {
      if (options?.forceReplace) {
        const { replaceLocalProducts } = await import("@/lib/local-data/products");
        await replaceLocalProducts(businessId, []);
        notifyLocalDataChanged("products");
      }
      return { ok: true, updated: 0, added: 0, message: "No cloud products yet" };
    }

    const { getLocalDB } = await import("@/lib/local-db/database");
    const db = getLocalDB();
    const timestamp = new Date().toISOString();
    const cloudIds = new Set(cloudProducts.map((p) => p.id));

    if (options?.forceReplace) {
      const { replaceLocalProducts } = await import("@/lib/local-data/products");
      const mapped = cloudProducts.map((p) =>
        mapCloudToLocal(businessId, p, timestamp)
      );
      await replaceLocalProducts(businessId, mapped);
      notifyLocalDataChanged("products");
      return {
        ok: true,
        updated: mapped.length,
        added: mapped.length,
        message: `Reloaded ${mapped.length} product(s) from team database`,
      };
    }

    let updated = 0;
    let added = 0;

    await db.transaction("rw", db.products, async () => {
      for (const product of cloudProducts) {
        const existing = await db.products.get(product.id);
        if (existing && existing.businessId === businessId) {
          await db.products.put(
            mapCloudToLocal(businessId, product, timestamp, existing)
          );
          updated += 1;
        } else if (!existing) {
          await db.products.put(mapCloudToLocal(businessId, product, timestamp));
          added += 1;
        }
      }

      // Soft-deactivate previously synced products removed from the team catalog.
      const localRows = await db.products
        .where("businessId")
        .equals(businessId)
        .toArray();
      for (const row of localRows) {
        if (
          row.syncedAt != null &&
          row.isActive &&
          !cloudIds.has(row.id)
        ) {
          await db.products.put({
            ...row,
            isActive: false,
            updatedAt: timestamp,
            syncedAt: timestamp,
          });
        }
      }
    });

    const total = updated + added;
    notifyLocalDataChanged("products");

    return {
      ok: true,
      updated: total,
      added,
      message:
        total > 0
          ? added > 0
            ? `Updated ${updated} · added ${added} product(s) from team`
            : `Updated ${total} products from team database`
          : "Team stock already up to date",
    };
  } catch {
    return {
      ok: false,
      updated: 0,
      added: 0,
      message: "Could not refresh team stock",
    };
  }
}

/** Push local edits, then replace local catalog from the team database. */
export async function reloadTeamCatalog(businessId: string): Promise<{
  push: ProductPushResult;
  pull: ProductPullResult;
}> {
  const push = await pushLocalProducts(businessId);
  const pull = await pullCloudProducts(businessId, { forceReplace: true });
  return { push, pull };
}

/** Full team catalog sync: upload local edits, then merge shared stock. */
export async function syncTeamProducts(businessId: string) {
  const push = await pushLocalProducts(businessId);
  const pull = await pullCloudProducts(businessId);
  return { push, pull };
}
