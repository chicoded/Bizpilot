import type { LocalCustomer, LocalExpense, LocalProduct } from "@/lib/local-db/types";
import { setLocalBusinessMeta } from "@/lib/local-data/business";
import { replaceLocalCustomers } from "@/lib/local-data/customers";
import { replaceLocalExpenses } from "@/lib/local-data/expenses";
import { listLocalProducts, replaceLocalProducts } from "@/lib/local-data/products";

export type AppContextResponse = {
  businessId: string | null;
  businessName: string | null;
  currency: string;
  industry?: string | null;
  role?: string | null;
  productCount?: number;
  memberships?: Array<{
    businessId: string;
    businessName: string;
    role: string;
    productCount: number;
  }>;
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
  source: "local" | "server" | "empty" | "merged";
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

  const businessId = context.businessId;
  const businessName = context.businessName ?? "My shop";
  const currency = context.currency;

  await setLocalBusinessMeta({
    businessId,
    name: businessName,
    currency,
    industry: context.industry ?? null,
    updatedAt: new Date().toISOString(),
  });

  const existingProducts = await listLocalProducts(businessId);

  // Always merge the shared team catalog when cloud is awake.
  // Local-only unsynced products are preserved inside pullCloudProducts.
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const { pingCloudDatabase, isCloudUsable } = await import(
        "@/lib/sync/cloud-status"
      );
      const cloud = await pingCloudDatabase({ wake: true });
      if (isCloudUsable(cloud.status)) {
        const { pushLocalProducts, pullCloudProducts } = await import(
          "@/lib/sync/products-sync"
        );
        await pushLocalProducts(businessId);
        await pullCloudProducts(businessId);
      }
    } catch {
      // Offline or sleeping cloud — keep local IndexedDB data.
    }
  }

  const [customersRes] = await Promise.all([
    fetchJson<{ customers: Array<{
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      debt?: number;
      lifetimeValue?: number;
    }> }>("/api/customers"),
  ]);

  // First-time empty device: if merge didn't land products, seed from API once.
  const afterMerge = await listLocalProducts(businessId);
  if (afterMerge.length === 0) {
    const productsRes = await fetchJson<{ products: Array<{
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
    }> }>("/api/products?sync=1");

    const timestamp = new Date().toISOString();
    if (productsRes?.products?.length) {
      const products: LocalProduct[] = productsRes.products.map((product) => ({
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
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncedAt: timestamp,
      }));
      await replaceLocalProducts(businessId, products);
    }
  }

  const localCustomers = await (async () => {
    try {
      const { listLocalCustomers } = await import("@/lib/local-data/customers");
      return listLocalCustomers(businessId);
    } catch {
      return [];
    }
  })();

  if (customersRes?.customers?.length && localCustomers.length === 0) {
    const timestamp = new Date().toISOString();
    const customers: LocalCustomer[] = customersRes.customers.map((customer) => ({
      id: customer.id,
      businessId,
      name: customer.name,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      debt: Number(customer.debt ?? 0),
      lifetimeValue: Number(customer.lifetimeValue ?? 0),
      createdAt: timestamp,
      updatedAt: timestamp,
      syncedAt: timestamp,
    }));
    await replaceLocalCustomers(businessId, customers);
  }

  if (existingProducts.length === 0) {
    await replaceLocalExpenses(businessId, [] as LocalExpense[]);
  }

  const finalProducts = await listLocalProducts(businessId);
  return {
    seeded: finalProducts.length > 0,
    source: existingProducts.length > 0 ? "merged" : "server",
  };
}
