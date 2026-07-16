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

export {
  pullCloudProducts,
  pushLocalProducts,
  syncTeamProducts,
  reloadTeamCatalog,
} from "@/lib/sync/products-sync";
