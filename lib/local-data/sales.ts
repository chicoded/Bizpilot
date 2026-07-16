import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { getLocalDB } from "@/lib/local-db/database";
import type { LocalSale } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";
import { nextLocalReceiptNumber } from "@/lib/local-data/receipt";
import { getLocalProduct } from "@/lib/local-data/products";
import { getLocalCustomer } from "@/lib/local-data/customers";
import type { PaymentMethod } from "@prisma/client";
import {
  assertSaleStockAvailable,
  buildSaleStockDeltas,
} from "@/lib/hybrid-inventory";
import { normalizeProductType } from "@/lib/product-types";

export type LocalSalePeriod = "today" | "week" | "month" | "all";

export type LocalSaleListItem = {
  id: string;
  receiptNumber: string;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  createdAt: Date;
  itemCount: number;
  customerName: string | null;
};

export type LocalSaleReceipt = {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  createdAt: Date;
  customer: { name: string; phone: string | null } | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    sellingPrice: number;
    total: number;
  }[];
};

export type CreateLocalSaleInput = {
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  customerId?: string;
  discount?: number;
  tax?: number;
  isCredit?: boolean;
  notes?: string;
  serviceType?: string;
};

export async function createLocalSale(
  businessId: string,
  input: CreateLocalSaleInput
): Promise<{ sale: LocalSale } | { error: string }> {
  if (input.items.length === 0) {
    return { error: "Add at least one product" };
  }

  const db = getLocalDB();
  let subtotal = 0;
  let totalCost = 0;
  const saleItems: LocalSale["items"] = [];

  for (const item of input.items) {
    const product = await getLocalProduct(businessId, item.productId);
    if (!product) {
      return { error: "One or more products were not found" };
    }

    const type = normalizeProductType(product.productType);
    if (type === "INGREDIENT" || type === "PACKAGING") {
      return { error: `${product.name} is not sold on POS` };
    }

    const lineTotal = product.sellingPrice * item.quantity;
    subtotal += lineTotal;
    totalCost += product.purchasePrice * item.quantity;

    saleItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      cost: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      total: lineTotal,
    });
  }

  const stockError = await assertSaleStockAvailable(
    (id) => getLocalProduct(businessId, id),
    input.items
  );
  if (stockError) {
    return { error: stockError };
  }

  const discount = input.discount ?? 0;
  const tax = input.tax ?? 0;
  const total = subtotal - discount + tax;
  const profit = total - totalCost;
  const timestamp = new Date().toISOString();

  const sale: LocalSale = {
    id: localId("sale"),
    businessId,
    receiptNumber: nextLocalReceiptNumber(),
    items: saleItems,
    subtotal,
    discount,
    tax,
    total,
    totalCost,
    profit,
    paymentMethod: input.paymentMethod,
    customerId: input.customerId ?? null,
    isCredit: input.isCredit ?? input.paymentMethod === "CREDIT",
    notes: input.notes ?? null,
    serviceType: input.serviceType ?? null,
    createdAt: timestamp,
    syncedAt: null,
  };

  await db.transaction("rw", db.sales, db.products, db.customers, async () => {
    const deltas = await buildSaleStockDeltas(
      async (id) => {
        const row = await db.products.get(id);
        if (!row || row.businessId !== businessId || !row.isActive) return undefined;
        return row;
      },
      input.items
    );
    if ("error" in deltas) {
      throw new Error(deltas.error);
    }

    for (const d of deltas) {
      const product = await db.products.get(d.productId);
      if (!product || product.businessId !== businessId) {
        throw new Error("Product missing during sale");
      }
      const nextQty = product.quantity + d.delta;
      if (nextQty < 0) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      await db.products.put({
        ...product,
        quantity: nextQty,
        updatedAt: timestamp,
      });
    }

    if ((input.isCredit || input.paymentMethod === "CREDIT") && input.customerId) {
      const customer = await db.customers.get(input.customerId);
      if (customer && customer.businessId === businessId) {
        await db.customers.put({
          ...customer,
          debt: customer.debt + total,
          lifetimeValue: customer.lifetimeValue + total,
          updatedAt: timestamp,
          syncedAt: null,
        });
      }
    }

    await db.sales.put(sale);
  });

  // Hybrid sync: keep working offline, queue for shared team database.
  try {
    const { queueLocalSaleForSync, flushSaleSyncQueue, pushLocalProducts } =
      await import("@/lib/sync/sales-sync");
    await queueLocalSaleForSync(businessId, sale);
    if (typeof navigator === "undefined" || navigator.onLine) {
      // Ensure catalog exists on cloud before sale upload.
      await pushLocalProducts(businessId);
      void flushSaleSyncQueue(businessId);
    }
  } catch {
    // Local sale already saved — sync can retry later.
  }

  return { sale };
}

export async function listLocalSales(businessId: string): Promise<LocalSale[]> {
  const db = getLocalDB();
  const sales = await db.sales.where("businessId").equals(businessId).toArray();
  return sales.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function replaceLocalSales(
  businessId: string,
  sales: LocalSale[]
): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.sales, async () => {
    const existing = await db.sales.where("businessId").equals(businessId).toArray();
    const incomingIds = new Set(sales.map((s) => s.id));
    const toDelete = existing.filter((s) => !incomingIds.has(s.id));
    if (toDelete.length > 0) {
      await db.sales.bulkDelete(toDelete.map((s) => s.id));
    }
    if (sales.length > 0) {
      await db.sales.bulkPut(sales);
    }
  });
}

function filterSalesByPeriod(sales: LocalSale[], period: LocalSalePeriod) {
  const now = new Date();
  return sales.filter((sale) => {
    const created = new Date(sale.createdAt);
    if (period === "today") {
      return created >= startOfDay(now) && created <= endOfDay(now);
    }
    if (period === "week") {
      return created >= subDays(now, 7);
    }
    if (period === "month") {
      return created >= startOfMonth(now) && created <= endOfMonth(now);
    }
    return true;
  });
}

export async function listLocalSalesSummary(
  businessId: string,
  period: LocalSalePeriod = "month"
) {
  const allSales = await listLocalSales(businessId);
  const sales = filterSalesByPeriod(allSales, period);
  const customerIds = [...new Set(sales.map((s) => s.customerId).filter(Boolean))] as string[];

  const customerNames = new Map<string, string>();
  await Promise.all(
    customerIds.map(async (id) => {
      const customer = await getLocalCustomer(businessId, id);
      if (customer) customerNames.set(id, customer.name);
    })
  );

  const items: LocalSaleListItem[] = sales.map((sale) => ({
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: sale.total,
    profit: sale.profit,
    paymentMethod: sale.paymentMethod as PaymentMethod,
    isCredit: sale.isCredit,
    createdAt: new Date(sale.createdAt),
    itemCount: sale.items.length,
    customerName: sale.customerId
      ? customerNames.get(sale.customerId) ?? null
      : null,
  }));

  return {
    sales: items,
    totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
    totalProfit: sales.reduce((sum, s) => sum + s.profit, 0),
    count: sales.length,
  };
}

export async function getLocalSaleReceipt(
  businessId: string,
  saleId: string
): Promise<LocalSaleReceipt | null> {
  const sale = await getLocalDB().sales.get(saleId);
  if (!sale || sale.businessId !== businessId) return null;

  const customer = sale.customerId
    ? await getLocalCustomer(businessId, sale.customerId)
    : undefined;

  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    profit: sale.profit,
    paymentMethod: sale.paymentMethod as PaymentMethod,
    isCredit: sale.isCredit,
    createdAt: new Date(sale.createdAt),
    customer: customer
      ? { name: customer.name, phone: customer.phone }
      : null,
    items: sale.items.map((item, index) => ({
      id: `${sale.id}-${index}`,
      name: item.productName,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      total: item.total,
    })),
  };
}

export async function getLocalWeeklyRevenue(businessId: string) {
  const sales = filterSalesByPeriod(await listLocalSales(businessId), "week");
  const buckets = new Map<string, number>();

  for (let i = 6; i >= 0; i--) {
    const day = subDays(new Date(), i);
    buckets.set(format(day, "EEE"), 0);
  }

  for (const sale of sales) {
    const label = format(new Date(sale.createdAt), "EEE");
    if (buckets.has(label)) {
      buckets.set(label, (buckets.get(label) ?? 0) + sale.total);
    }
  }

  return Array.from(buckets.entries()).map(([label, revenue]) => ({
    label,
    revenue,
    expenses: 0,
  }));
}
