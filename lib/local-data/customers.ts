import { getLocalDB } from "@/lib/local-db/database";import type { LocalCustomer } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";
import { listLocalSales } from "@/lib/local-data/sales";

function nowIso() {
  return new Date().toISOString();
}

export type LocalCustomerListItem = LocalCustomer & {
  lastPurchase: string | null;
};

export async function listLocalCustomers(
  businessId: string
): Promise<LocalCustomer[]> {
  const db = getLocalDB();
  const customers = await db.customers.where("businessId").equals(businessId).toArray();
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listLocalCustomersWithMeta(
  businessId: string
): Promise<LocalCustomerListItem[]> {
  const [customers, sales] = await Promise.all([
    listLocalCustomers(businessId),
    listLocalSales(businessId),
  ]);

  const lastPurchaseByCustomer = new Map<string, string>();
  for (const sale of sales) {
    if (!sale.customerId) continue;
    const existing = lastPurchaseByCustomer.get(sale.customerId);
    if (!existing || sale.createdAt > existing) {
      lastPurchaseByCustomer.set(sale.customerId, sale.createdAt);
    }
  }

  return customers
    .map((customer) => ({
      ...customer,
      lastPurchase: lastPurchaseByCustomer.get(customer.id) ?? null,
    }))
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export async function getLocalCustomer(
  businessId: string,
  customerId: string
): Promise<LocalCustomer | undefined> {
  const customer = await getLocalDB().customers.get(customerId);
  if (!customer || customer.businessId !== businessId) return undefined;
  return customer;
}

export async function replaceLocalCustomers(
  businessId: string,
  customers: LocalCustomer[]
): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.customers, async () => {
    const existing = await db.customers.where("businessId").equals(businessId).toArray();
    const incomingIds = new Set(customers.map((c) => c.id));
    const toDelete = existing.filter((c) => !incomingIds.has(c.id));
    if (toDelete.length > 0) {
      await db.customers.bulkDelete(toDelete.map((c) => c.id));
    }
    if (customers.length > 0) {
      await db.customers.bulkPut(customers);
    }
  });
}

export async function createLocalCustomer(
  businessId: string,
  input: { name: string; phone?: string | null; email?: string | null }
): Promise<LocalCustomer> {
  const timestamp = nowIso();
  const customer: LocalCustomer = {
    id: localId("cust"),
    businessId,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    debt: 0,
    lifetimeValue: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await getLocalDB().customers.put(customer);
  return customer;
}

export async function updateLocalCustomer(
  businessId: string,
  customerId: string,
  input: { name: string; phone?: string | null; email?: string | null }
): Promise<LocalCustomer | null> {
  const existing = await getLocalCustomer(businessId, customerId);
  if (!existing) return null;

  const updated: LocalCustomer = {
    ...existing,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    updatedAt: nowIso(),
    syncedAt: null,
  };

  await getLocalDB().customers.put(updated);
  return updated;
}

export async function recordLocalDebtPayment(
  businessId: string,
  customerId: string,
  amount: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const customer = await getLocalCustomer(businessId, customerId);
  if (!customer) return { ok: false, error: "Customer not found" };

  const payment = Number(amount);
  if (!payment || payment <= 0) {
    return { ok: false, error: "Enter an amount greater than zero" };
  }
  if (payment > customer.debt) {
    return { ok: false, error: "Payment exceeds outstanding debt" };
  }

  await getLocalDB().customers.put({
    ...customer,
    debt: customer.debt - payment,
    updatedAt: nowIso(),
    syncedAt: null,
  });

  return { ok: true };
}

export async function addLocalCustomerDebt(
  businessId: string,
  customerId: string,
  amount: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const customer = await getLocalCustomer(businessId, customerId);
  if (!customer) return { ok: false, error: "Customer not found" };

  const added = Number(amount);
  if (!added || added <= 0) {
    return { ok: false, error: "Enter an amount greater than zero" };
  }

  await getLocalDB().customers.put({
    ...customer,
    debt: customer.debt + added,
    updatedAt: nowIso(),
    syncedAt: null,
  });

  return { ok: true };
}

export async function listLocalDebtors(businessId: string) {
  const customers = await listLocalCustomers(businessId);
  const sales = await listLocalSales(businessId);

  return customers
    .filter((c) => c.debt > 0)
    .map((customer) => {
      const lastCreditSale = sales.find(
        (sale) => sale.customerId === customer.id && sale.isCredit
      );
      return {
        ...customer,
        lastCreditSaleAt: lastCreditSale?.createdAt ?? null,
      };
    })
    .sort((a, b) => b.debt - a.debt);
}
