import { getLocalDB } from "@/lib/local-db/database";
import type { LocalCustomer } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";

function nowIso() {
  return new Date().toISOString();
}

export async function listLocalCustomers(
  businessId: string
): Promise<LocalCustomer[]> {
  const db = getLocalDB();
  const customers = await db.customers.where("businessId").equals(businessId).toArray();
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function replaceLocalCustomers(
  businessId: string,
  customers: LocalCustomer[]
): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.customers, async () => {
    const existing = await db.customers.where({ businessId }).toArray();
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
