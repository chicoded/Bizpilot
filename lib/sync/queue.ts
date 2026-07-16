import { getLocalDB } from "@/lib/local-db/database";
import { localId } from "@/lib/local-data/id";
import type { SyncQueueItem } from "@/lib/local-db/types";

export type SaleSyncPayload = {
  clientSaleId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  customerId?: string | null;
  customer?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  discount?: number;
  tax?: number;
  createdAt: string;
  deviceId: string;
};

function nowIso() {
  return new Date().toISOString();
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const key = "bizpilot_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `dev_${Date.now()}`;
  localStorage.setItem(key, id);
  return id;
}

export async function enqueueSaleSync(
  businessId: string,
  payload: SaleSyncPayload
): Promise<SyncQueueItem> {
  const db = getLocalDB();
  const existing = await db.syncQueue
    .where("entityId")
    .equals(payload.clientSaleId)
    .first();

  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const item: SyncQueueItem = {
    id: localId("sync"),
    businessId,
    type: "sale",
    entityId: payload.clientSaleId,
    payload: JSON.stringify(payload),
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.syncQueue.put(item);
  return item;
}

export async function listPendingSaleSyncs(
  businessId: string
): Promise<SyncQueueItem[]> {
  const db = getLocalDB();
  const rows = await db.syncQueue
    .where("businessId")
    .equals(businessId)
    .toArray();
  return rows
    .filter(
      (row) =>
        row.type === "sale" &&
        (row.status === "pending" ||
          row.status === "error" ||
          row.status === "conflict")
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listSaleSyncProblems(
  businessId: string
): Promise<{ id: string; status: string; lastError: string | null }[]> {
  const db = getLocalDB();
  const rows = await db.syncQueue.where("businessId").equals(businessId).toArray();
  return rows
    .filter(
      (row) =>
        row.type === "sale" &&
        (row.status === "error" || row.status === "conflict") &&
        Boolean(row.lastError)
    )
    .map((row) => ({
      id: row.id,
      status: row.status,
      lastError: row.lastError,
    }));
}

/** Drop stuck failed sales from the queue (local receipt stays on this device). */
export async function dismissFailedSaleSyncs(
  businessId: string
): Promise<number> {
  const db = getLocalDB();
  const rows = await db.syncQueue.where("businessId").equals(businessId).toArray();
  let cleared = 0;
  for (const row of rows) {
    if (
      row.type === "sale" &&
      (row.status === "error" || row.status === "conflict")
    ) {
      await db.syncQueue.put({
        ...row,
        status: "synced",
        lastError: row.lastError
          ? `dismissed: ${row.lastError}`
          : "dismissed",
        updatedAt: nowIso(),
      });
      cleared += 1;
    }
  }
  return cleared;
}

export async function countUnsyncedSales(businessId: string): Promise<number> {
  const db = getLocalDB();
  const rows = await db.syncQueue.where("businessId").equals(businessId).toArray();
  return rows.filter(
    (row) =>
      row.type === "sale" &&
      (row.status === "pending" ||
        row.status === "error" ||
        row.status === "conflict" ||
        row.status === "syncing")
  ).length;
}

export async function updateSyncQueueItem(
  id: string,
  patch: Partial<Pick<SyncQueueItem, "status" | "attempts" | "lastError">>
): Promise<void> {
  const db = getLocalDB();
  const existing = await db.syncQueue.get(id);
  if (!existing) return;
  await db.syncQueue.put({
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  });
}

export async function markSaleSyncedLocally(
  businessId: string,
  saleId: string,
  serverReceiptNumber?: string
): Promise<void> {
  const db = getLocalDB();
  const sale = await db.sales.get(saleId);
  if (!sale || sale.businessId !== businessId) return;
  await db.sales.put({
    ...sale,
    receiptNumber: serverReceiptNumber || sale.receiptNumber,
    syncedAt: nowIso(),
  });
}
