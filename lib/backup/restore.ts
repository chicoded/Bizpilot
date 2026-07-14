import { setLocalBusinessMeta } from "@/lib/local-data/business";
import { replaceLocalCustomers } from "@/lib/local-data/customers";
import { replaceLocalExpenses } from "@/lib/local-data/expenses";
import { replaceLocalProducts } from "@/lib/local-data/products";
import { replaceLocalSales } from "@/lib/local-data/sales";
import type { BackupExportPayload } from "@/lib/backup/export";
import type {
  LocalCustomer,
  LocalExpense,
  LocalProduct,
  LocalSale,
} from "@/lib/local-db/types";

export type RestoreSummary = {
  businessId: string;
  businessName: string;
  products: number;
  customers: number;
  sales: number;
  expenses: number;
  exportedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBackupJson(raw: string): BackupExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file is not a valid BizPilot backup (bad JSON).");
  }

  if (!isRecord(parsed)) {
    throw new Error("This file is not a valid BizPilot backup.");
  }

  if (parsed.version !== 1) {
    throw new Error("Unsupported backup version. Update the app and try again.");
  }

  if (!Array.isArray(parsed.products) || !Array.isArray(parsed.customers)) {
    throw new Error("Backup is missing products or customers.");
  }

  const business = isRecord(parsed.business) ? parsed.business : null;
  if (!business?.businessId || typeof business.businessId !== "string") {
    throw new Error("Backup is missing shop id. Use a file exported from BizPilot.");
  }

  return {
    version: 1,
    exportedAt:
      typeof parsed.exportedAt === "string"
        ? parsed.exportedAt
        : new Date().toISOString(),
    business: {
      businessId: business.businessId,
      name:
        typeof business.name === "string" && business.name.trim()
          ? business.name
          : "My shop",
      currency:
        typeof business.currency === "string" && business.currency.trim()
          ? business.currency
          : "NGN",
      updatedAt:
        typeof business.updatedAt === "string"
          ? business.updatedAt
          : new Date().toISOString(),
    },
    products: parsed.products as LocalProduct[],
    customers: parsed.customers as LocalCustomer[],
    sales: (Array.isArray(parsed.sales) ? parsed.sales : []) as LocalSale[],
    expenses: (Array.isArray(parsed.expenses)
      ? parsed.expenses
      : []) as LocalExpense[],
  };
}

export async function restoreBackupFromJson(
  raw: string
): Promise<RestoreSummary> {
  const payload = parseBackupJson(raw);
  const business = payload.business!;
  const businessId = business.businessId;

  const products = payload.products.map((p) => ({
    ...p,
    businessId,
  }));
  const customers = payload.customers.map((c) => ({
    ...c,
    businessId,
  }));
  const sales = payload.sales.map((s) => ({
    ...s,
    businessId,
  }));
  const expenses = payload.expenses.map((e) => ({
    ...e,
    businessId,
  }));

  await setLocalBusinessMeta({
    ...business,
    updatedAt: new Date().toISOString(),
  });
  await replaceLocalProducts(businessId, products);
  await replaceLocalCustomers(businessId, customers);
  await replaceLocalSales(businessId, sales);
  await replaceLocalExpenses(businessId, expenses);

  return {
    businessId,
    businessName: business.name,
    products: products.length,
    customers: customers.length,
    sales: sales.length,
    expenses: expenses.length,
    exportedAt: payload.exportedAt,
  };
}

export async function restoreBackupFromFile(file: File): Promise<RestoreSummary> {
  if (!file.name.toLowerCase().endsWith(".json") && file.type && !file.type.includes("json")) {
    throw new Error("Choose a BizPilot backup .json file.");
  }
  const raw = await file.text();
  return restoreBackupFromJson(raw);
}
