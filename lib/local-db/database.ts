import Dexie, { type Table } from "dexie";
import type {
  LocalBackupSnapshot,
  LocalBusinessMeta,
  LocalCustomer,
  LocalExpense,
  LocalProduct,
  LocalSale,
  SyncQueueItem,
} from "@/lib/local-db/types";

export class BizPilotLocalDB extends Dexie {
  products!: Table<LocalProduct, string>;
  customers!: Table<LocalCustomer, string>;
  sales!: Table<LocalSale, string>;
  expenses!: Table<LocalExpense, string>;
  businessMeta!: Table<LocalBusinessMeta, string>;
  backupSnapshots!: Table<LocalBackupSnapshot, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("bizpilot_local");

    this.version(1).stores({
      products: "id, businessId, name, barcode, isActive, updatedAt",
      customers: "id, businessId, name, updatedAt",
      sales: "id, businessId, receiptNumber, createdAt",
      expenses: "id, businessId, date, createdAt",
      businessMeta: "businessId",
      backupSnapshots: "id, businessId, createdAt",
    });

    this.version(2).stores({
      products: "id, businessId, name, barcode, isActive, updatedAt",
      customers: "id, businessId, name, updatedAt",
      sales: "id, businessId, receiptNumber, createdAt, syncedAt",
      expenses: "id, businessId, date, createdAt",
      businessMeta: "businessId",
      backupSnapshots: "id, businessId, createdAt",
      syncQueue: "id, businessId, type, entityId, status, updatedAt",
    });
  }
}

let dbInstance: BizPilotLocalDB | null = null;

export function getLocalDB(): BizPilotLocalDB {
  if (typeof window === "undefined") {
    throw new Error("Local database is only available in the browser");
  }

  if (!dbInstance) {
    dbInstance = new BizPilotLocalDB();
  }

  return dbInstance;
}
