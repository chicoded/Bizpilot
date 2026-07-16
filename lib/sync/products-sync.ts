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

async function listUnsyncedLocalProducts(
  businessId: string
): Promise<LocalProduct[]> {
  const { getLocalDB } = await import("@/lib/local-db/database");
  const db = getLocalDB();
  const rows = await db.products.where("businessId").equals(businessId).toArray();
  // Include inactive so soft-deletes also reach the team database.
  return rows.filter((p) => p.syncedAt == null);
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

/** Pull shared products from cloud into local IndexedDB (merge by id). */
export async function pullCloudProducts(businessId: string): Promise<ProductPullResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true, updated: 0, added: 0, message: "Offline — using local stock" };
  }

  try {
    const response = await fetch("/api/products?sync=1", { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false,
        updated: 0,
        added: 0,
        message: "Could not refresh team stock",
      };
    }

    const data = (await response.json()) as {
      products: Array<{
        id: string;
        name: string;
        sellingPrice: number;
        purchasePrice?: number;
        quantity: number;
        barcode?: string | null;
        category?: string | null;
        reorderLevel?: number;
        unitsPerPack?: number;
        sku?: string | null;
        imageUrl?: string | null;
        isActive?: boolean;
      }>;
    };

    if (!data.products?.length) {
      return { ok: true, updated: 0, added: 0, message: "No cloud products yet" };
    }

    const { getLocalDB } = await import("@/lib/local-db/database");
    const db = getLocalDB();
    const timestamp = new Date().toISOString();
    let updated = 0;
    let added = 0;

    await db.transaction("rw", db.products, async () => {
      for (const product of data.products) {
        const existing = await db.products.get(product.id);
        if (existing && existing.businessId === businessId) {
          // Keep newer local unsynced edits; otherwise take team stock.
          if (existing.syncedAt == null) {
            continue;
          }
          await db.products.put({
            ...existing,
            name: product.name,
            sku: product.sku ?? existing.sku,
            sellingPrice: Number(product.sellingPrice),
            purchasePrice: Number(
              product.purchasePrice ?? existing.purchasePrice
            ),
            quantity: product.quantity,
            barcode: product.barcode ?? existing.barcode,
            category: product.category ?? existing.category,
            reorderLevel: product.reorderLevel ?? existing.reorderLevel,
            unitsPerPack: product.unitsPerPack ?? existing.unitsPerPack,
            imageUrl: product.imageUrl ?? existing.imageUrl,
            isActive: product.isActive !== false,
            updatedAt: timestamp,
            syncedAt: timestamp,
          });
          updated += 1;
        } else if (!existing) {
          await db.products.put({
            id: product.id,
            businessId,
            name: product.name,
            sku: product.sku ?? null,
            barcode: product.barcode ?? null,
            category: product.category ?? null,
            purchasePrice: Number(product.purchasePrice ?? 0),
            sellingPrice: Number(product.sellingPrice),
            unitsPerPack: product.unitsPerPack ?? 1,
            quantity: product.quantity,
            reorderLevel: product.reorderLevel ?? 5,
            batchNumber: null,
            expiryDate: null,
            imageUrl: product.imageUrl ?? null,
            isActive: product.isActive !== false,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncedAt: timestamp,
          });
          added += 1;
        }
      }
    });

    const total = updated + added;
    if (total > 0) {
      notifyLocalDataChanged("products");
    }

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

/** Full team catalog sync: upload local edits, then download shared stock. */
export async function syncTeamProducts(businessId: string) {
  const push = await pushLocalProducts(businessId);
  const pull = await pullCloudProducts(businessId);
  return { push, pull };
}
