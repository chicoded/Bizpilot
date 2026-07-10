import Dexie, { type Table } from "dexie";
import type {
  LocalBackupSnapshot,
  LocalBusinessMeta,
  LocalCustomer,
  LocalExpense,
  LocalProduct,
  LocalSale,
} from "@/lib/local-db/types";

export class BizPilotLocalDB extends Dexie {
  products!: Table<LocalProduct, string>;
  customers!: Table<LocalCustomer, string>;
  sales!: Table<LocalSale, string>;
  expenses!: Table<LocalExpense, string>;
  businessMeta!: Table<LocalBusinessMeta, string>;
  backupSnapshots!: Table<LocalBackupSnapshot, string>;

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
