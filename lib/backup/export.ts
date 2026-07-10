import { getLocalDB } from "@/lib/local-db/database";
import { localId } from "@/lib/local-data/id";
import type { LocalBackupSnapshot } from "@/lib/local-db/types";

import type { LocalBusinessMeta, LocalCustomer, LocalExpense, LocalProduct, LocalSale } from "@/lib/local-db/types";

export type BackupExportPayload = {
  version: 1;
  exportedAt: string;
  business: LocalBusinessMeta | null | undefined;
  products: LocalProduct[];
  customers: LocalCustomer[];
  sales: LocalSale[];
  expenses: LocalExpense[];
};

export async function buildBackupPayload(
  businessId: string
): Promise<BackupExportPayload> {
  const { getLocalBusinessMeta } = await import("@/lib/local-data/business");
  const { listLocalProducts } = await import("@/lib/local-data/products");
  const { listLocalCustomers } = await import("@/lib/local-data/customers");
  const { listLocalSales } = await import("@/lib/local-data/sales");
  const { listLocalExpenses } = await import("@/lib/local-data/expenses");

  const [business, products, customers, sales, expenses] = await Promise.all([
    getLocalBusinessMeta(),
    listLocalProducts(businessId),
    listLocalCustomers(businessId),
    listLocalSales(businessId),
    listLocalExpenses(businessId),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    business: business ?? null,
    products,
    customers,
    sales,
    expenses,
  };
}

export async function exportBackupJson(businessId: string): Promise<string> {
  const payload = await buildBackupPayload(businessId);
  return JSON.stringify(payload, null, 2);
}

export async function saveBackupSnapshot(businessId: string): Promise<LocalBackupSnapshot> {
  const json = await exportBackupJson(businessId);
  const snapshot: LocalBackupSnapshot = {
    id: localId("backup"),
    businessId,
    createdAt: new Date().toISOString(),
    sizeBytes: new Blob([json]).size,
    payload: json,
  };

  const db = getLocalDB();
  await db.backupSnapshots.put(snapshot);

  const all = await db.backupSnapshots
    .where({ businessId })
    .sortBy("createdAt");
  const keep = all.slice(-5);
  const remove = all.slice(0, Math.max(0, all.length - 5));
  if (remove.length > 0) {
    await db.backupSnapshots.bulkDelete(remove.map((s) => s.id));
  }

  return keep[keep.length - 1] ?? snapshot;
}

export function downloadBackupFile(json: string, businessName: string) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = businessName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  const filename = `bizpilot-backup-${safeName || "shop"}-${date}.json`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareBackupFile(json: string, businessName: string) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `bizpilot-backup-${businessName.replace(/[^a-z0-9-_]+/gi, "-") || "shop"}-${date}.json`;
  const file = new File([json], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "BizPilot backup",
      text: "BizPilot shop data backup",
      files: [file],
    });
    return { method: "share" as const };
  }

  downloadBackupFile(json, businessName);
  return { method: "download" as const };
}
