import type { LocalCustomer, LocalExpense, LocalProduct } from "@/lib/local-db/types";
import { setLocalBusinessMeta } from "@/lib/local-data/business";
import { replaceLocalCustomers } from "@/lib/local-data/customers";
import { replaceLocalExpenses } from "@/lib/local-data/expenses";
import { listLocalProducts, replaceLocalProducts } from "@/lib/local-data/products";

export type AppContextResponse = {
  businessId: string;
  businessName: string;
  currency: string;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function hydrateLocalStoreFromServer(): Promise<{
  seeded: boolean;
  source: "local" | "server" | "empty";
}> {
  const context = await fetchJson<AppContextResponse>("/api/context");
  if (!context?.businessId) {
    const { getActiveBusinessId } = await import("@/lib/local-data/business");
    const existingId = await getActiveBusinessId();
    if (!existingId) {
      return { seeded: false, source: "empty" };
    }
    const existing = await listLocalProducts(existingId);
    return {
      seeded: existing.length > 0,
      source: existing.length > 0 ? "local" : "empty",
    };
  }

  await setLocalBusinessMeta({
    businessId: context.businessId,
    name: context.businessName,
    currency: context.currency,
    updatedAt: new Date().toISOString(),
  });

  const existingProducts = await listLocalProducts(context.businessId);
  if (existingProducts.length > 0) {
    return { seeded: true, source: "local" };
  }

  const [productsRes, customersRes] = await Promise.all([
    fetchJson<{ products: Array<{
      id: string;
      name: string;
      sellingPrice: number;
      purchasePrice?: number;
      quantity: number;
      barcode?: string | null;
      category?: string | null;
      reorderLevel?: number;
      imageUrl?: string | null;
    }> }>("/api/products"),
    fetchJson<{ customers: Array<{
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      debt?: number;
      lifetimeValue?: number;
    }> }>("/api/customers"),
  ]);

  const timestamp = new Date().toISOString();

  if (productsRes?.products?.length) {
    const products: LocalProduct[] = productsRes.products.map((product) => ({
      id: product.id,
      businessId: context.businessId,
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
    }));
    await replaceLocalProducts(context.businessId, products);
  }

  if (customersRes?.customers?.length) {
    const customers: LocalCustomer[] = customersRes.customers.map((customer) => ({
      id: customer.id,
      businessId: context.businessId,
      name: customer.name,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      debt: Number(customer.debt ?? 0),
      lifetimeValue: Number(customer.lifetimeValue ?? 0),
      createdAt: timestamp,
      updatedAt: timestamp,
      syncedAt: timestamp,
    }));
    await replaceLocalCustomers(context.businessId, customers);
  }

  await replaceLocalExpenses(context.businessId, [] as LocalExpense[]);

  return {
    seeded: Boolean(productsRes?.products?.length || customersRes?.customers?.length),
    source: "server",
  };
}
