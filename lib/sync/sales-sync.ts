import {
  enqueueSaleSync,
  getOrCreateDeviceId,
  listPendingSaleSyncs,
  markSaleSyncedLocally,
  updateSyncQueueItem,
  type SaleSyncPayload,
  countUnsyncedSales,
  listSaleSyncProblems,
  dismissFailedSaleSyncs,
} from "@/lib/sync/queue";
import { getLocalCustomer } from "@/lib/local-data/customers";
import type { LocalSale } from "@/lib/local-db/types";
import {
  pullCloudProducts,
  pushLocalProducts,
  syncTeamProducts,
  reloadTeamCatalog,
} from "@/lib/sync/products-sync";

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
    const failureReasons: string[] = [];

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

        const reason = data.error ?? `HTTP ${response.status}`;

        if (
          response.status === 409 ||
          data.code === "STOCK_CONFLICT" ||
          data.code === "MISSING_PRODUCTS"
        ) {
          await updateSyncQueueItem(item.id, {
            status: "conflict",
            lastError: reason,
          });
          conflicts += 1;
          failureReasons.push(reason);
          continue;
        }

        await updateSyncQueueItem(item.id, {
          status: "error",
          lastError: reason,
        });
        errors += 1;
        failureReasons.push(reason);
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Network error";
        await updateSyncQueueItem(item.id, {
          status: "error",
          lastError: reason,
        });
        errors += 1;
        failureReasons.push(reason);
      }
    }

    const messageParts: string[] = [];
    if (synced > 0) messageParts.push(`${synced} synced to team database`);
    if (conflicts > 0) messageParts.push(`${conflicts} conflict(s)`);
    if (errors > 0) messageParts.push(`${errors} failed`);
    if (messageParts.length === 0) messageParts.push("Nothing pending");
    if (failureReasons.length > 0) {
      const unique = [...new Set(failureReasons)].slice(0, 2);
      messageParts.push(`Reason: ${unique.join(" · ")}`);
    }

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

export type SalePullResult = {
  ok: boolean;
  added: number;
  message: string;
};

type CloudSaleRow = {
  id: string;
  receiptNumber: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  isCredit: boolean;
  notes?: string | null;
  customerId: string | null;
  createdAt: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    sellingPrice: number;
    total: number;
  }[];
};

/** Pull recent team sales into local history so cashiers see owner sales. */
export async function pullCloudSales(
  businessId: string
): Promise<SalePullResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true, added: 0, message: "Offline — local sales only" };
  }

  try {
    const response = await fetch("/api/sync/sales?limit=50", {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as {
      sales?: CloudSaleRow[];
      error?: string;
    } | null;

    if (!response.ok || !Array.isArray(data?.sales)) {
      return {
        ok: false,
        added: 0,
        message: data?.error ?? "Could not load team sales",
      };
    }

    const { getLocalDB } = await import("@/lib/local-db/database");
    const { notifyLocalDataChanged } = await import("@/lib/sync/events");
    const db = getLocalDB();
    let added = 0;
    const timestamp = new Date().toISOString();

    await db.transaction("rw", db.sales, async () => {
      for (const sale of data.sales!) {
        const localId = sale.id;
        const existing = await db.sales.get(localId);
        if (existing) {
          if (!existing.syncedAt) {
            await db.sales.put({ ...existing, syncedAt: timestamp });
          }
          continue;
        }

        // Also skip if we already have this receipt from another id.
        const sameReceipt = await db.sales
          .where("businessId")
          .equals(businessId)
          .filter((row) => row.receiptNumber === sale.receiptNumber)
          .first();
        if (sameReceipt) continue;

        const totalCost = sale.items.reduce(
          (sum, item) => sum + item.cost * item.quantity,
          0
        );

        await db.sales.put({
          id: localId,
          businessId,
          receiptNumber: sale.receiptNumber,
          items: sale.items,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax: sale.tax,
          total: sale.total,
          totalCost,
          profit: sale.profit,
          paymentMethod: sale.paymentMethod,
          customerId: sale.customerId,
          isCredit: sale.isCredit,
          notes: sale.notes ?? null,
          createdAt: sale.createdAt,
          syncedAt: timestamp,
        });
        added += 1;
      }
    });

    if (added > 0) notifyLocalDataChanged("sales");

    return {
      ok: true,
      added,
      message:
        added > 0
          ? `Loaded ${added} team sale(s)`
          : "Team sales already up to date",
    };
  } catch {
    return { ok: false, added: 0, message: "Could not load team sales" };
  }
}

/** Push products, flush sales, pull stock + recent team sales. */
export async function syncTeamData(businessId: string) {
  const push = await pushLocalProducts(businessId);
  const flush = await flushSaleSyncQueue(businessId);
  const pullProducts = await pullCloudProducts(businessId);
  const pullSales = await pullCloudSales(businessId);
  return { push, flush, pullProducts, pullSales };
}

export { listSaleSyncProblems, dismissFailedSaleSyncs } from "@/lib/sync/queue";

export {
  pullCloudProducts,
  pushLocalProducts,
  syncTeamProducts,
  reloadTeamCatalog,
};