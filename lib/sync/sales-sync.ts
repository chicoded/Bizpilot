import {
  enqueueSaleSync,
  getOrCreateDeviceId,
  listPendingSaleSyncs,
  markSaleSyncedLocally,
  updateSyncQueueItem,
  type SaleSyncPayload,
  countUnsyncedSales,
} from "@/lib/sync/queue";
import { getLocalCustomer } from "@/lib/local-data/customers";
import type { LocalSale } from "@/lib/local-db/types";

export type SyncFlushResult = {
  ok: boolean;
  synced: number;
  conflicts: number;
  errors: number;
  message: string;
};

let flushInFlight: Promise<SyncFlushResult> | null = null;

export async function queueLocalSaleForSync(
  businessId: string,
  sale: LocalSale
): Promise<void> {
  let customer:
    | { name: string; phone?: string | null; email?: string | null }
    | null
    | undefined;

  if (sale.customerId) {
    const localCustomer = await getLocalCustomer(businessId, sale.customerId);
    if (localCustomer) {
      customer = {
        name: localCustomer.name,
        phone: localCustomer.phone,
        email: localCustomer.email,
      };
    }
  }

  const payload: SaleSyncPayload = {
    clientSaleId: sale.id,
    items: sale.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    paymentMethod: sale.paymentMethod,
    customerId: sale.customerId,
    customer,
    discount: sale.discount,
    tax: sale.tax,
    createdAt: sale.createdAt,
    deviceId: getOrCreateDeviceId(),
  };

  await enqueueSaleSync(businessId, payload);
}

export async function flushSaleSyncQueue(
  businessId: string
): Promise<SyncFlushResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const pending = await countUnsyncedSales(businessId);
    return {
      ok: true,
      synced: 0,
      conflicts: 0,
      errors: 0,
      message:
        pending > 0
          ? `${pending} sale(s) waiting to sync when online`
          : "All sales synced",
    };
  }

  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const pending = await listPendingSaleSyncs(businessId);
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const item of pending) {
      await updateSyncQueueItem(item.id, {
        status: "syncing",
        attempts: item.attempts + 1,
      });

      try {
        const payload = JSON.parse(item.payload) as SaleSyncPayload;
        const response = await fetch("/api/sync/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          code?: string;
          receiptNumber?: string;
        };

        if (response.ok && data.ok) {
          await markSaleSyncedLocally(
            businessId,
            item.entityId,
            data.receiptNumber
          );
          await updateSyncQueueItem(item.id, {
            status: "synced",
            lastError: null,
          });
          synced += 1;
          continue;
        }

        if (response.status === 409 || data.code === "STOCK_CONFLICT" || data.code === "MISSING_PRODUCTS") {
          await updateSyncQueueItem(item.id, {
            status: "conflict",
            lastError: data.error ?? "Sync conflict",
          });
          conflicts += 1;
          continue;
        }

        await updateSyncQueueItem(item.id, {
          status: "error",
          lastError: data.error ?? `HTTP ${response.status}`,
        });
        errors += 1;
      } catch (error) {
        await updateSyncQueueItem(item.id, {
          status: "error",
          lastError:
            error instanceof Error ? error.message : "Network error",
        });
        errors += 1;
      }
    }

    const messageParts: string[] = [];
    if (synced > 0) messageParts.push(`${synced} synced to team database`);
    if (conflicts > 0) messageParts.push(`${conflicts} conflict(s)`);
    if (errors > 0) messageParts.push(`${errors} failed`);
    if (messageParts.length === 0) messageParts.push("Nothing pending");

    return {
      ok: conflicts === 0 && errors === 0,
      synced,
      conflicts,
      errors,
      message: messageParts.join(" · "),
    };
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}

/** Pull shared product stock from cloud into local IndexedDB (merge by id). */
export async function pullCloudProducts(businessId: string): Promise<{
  ok: boolean;
  updated: number;
  message: string;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true, updated: 0, message: "Offline — using local stock" };
  }

  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false,
        updated: 0,
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
        imageUrl?: string | null;
      }>;
    };

    if (!data.products?.length) {
      return { ok: true, updated: 0, message: "No cloud products yet" };
    }

    const { getLocalDB } = await import("@/lib/local-db/database");
    const db = getLocalDB();
    const timestamp = new Date().toISOString();
    let updated = 0;

    await db.transaction("rw", db.products, async () => {
      for (const product of data.products) {
        const existing = await db.products.get(product.id);
        if (existing && existing.businessId === businessId) {
          await db.products.put({
            ...existing,
            name: product.name,
            sellingPrice: Number(product.sellingPrice),
            purchasePrice: Number(
              product.purchasePrice ?? existing.purchasePrice
            ),
            quantity: product.quantity,
            barcode: product.barcode ?? existing.barcode,
            category: product.category ?? existing.category,
            reorderLevel: product.reorderLevel ?? existing.reorderLevel,
            imageUrl: product.imageUrl ?? existing.imageUrl,
            updatedAt: timestamp,
            syncedAt: timestamp,
          });
          updated += 1;
        } else if (!existing) {
          await db.products.put({
            id: product.id,
            businessId,
            name: product.name,
            sku: null,
            barcode: product.barcode ?? null,
            category: product.category ?? null,
            purchasePrice: Number(product.purchasePrice ?? 0),
            sellingPrice: Number(product.sellingPrice),
            unitsPerPack: 1,
            quantity: product.quantity,
            reorderLevel: product.reorderLevel ?? 5,
            batchNumber: null,
            expiryDate: null,
            imageUrl: product.imageUrl ?? null,
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            syncedAt: timestamp,
          });
          updated += 1;
        }
      }
    });

    return {
      ok: true,
      updated,
      message: `Updated ${updated} products from team database`,
    };
  } catch {
    return {
      ok: false,
      updated: 0,
      message: "Could not refresh team stock",
    };
  }
}
