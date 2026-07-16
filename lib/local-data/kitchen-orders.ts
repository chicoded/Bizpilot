import { getLocalDB } from "@/lib/local-db/database";
import type { LocalKitchenOrder } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";

export type CreateLocalKitchenOrderInput = {
  saleId: string | null;
  orderNumber: string;
  serviceType: string;
  notes?: string | null;
  items: {
    productId: string | null;
    productName: string;
    quantity: number;
    notes?: string | null;
  }[];
};

export async function createLocalKitchenOrder(
  businessId: string,
  input: CreateLocalKitchenOrderInput
): Promise<LocalKitchenOrder> {
  const db = getLocalDB();
  const timestamp = new Date().toISOString();
  const order: LocalKitchenOrder = {
    id: localId("korder"),
    businessId,
    saleId: input.saleId,
    orderNumber: input.orderNumber,
    serviceType: input.serviceType,
    status: "PENDING",
    notes: input.notes ?? null,
    items: input.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
    syncedAt: null,
  };
  await db.kitchenOrders.put(order);
  return order;
}

export async function listLocalKitchenOrders(
  businessId: string,
  options?: { activeOnly?: boolean }
): Promise<LocalKitchenOrder[]> {
  const db = getLocalDB();
  let rows = await db.kitchenOrders.where("businessId").equals(businessId).toArray();
  if (options?.activeOnly) {
    rows = rows.filter((o) =>
      ["PENDING", "PREPARING", "READY"].includes(o.status)
    );
  }
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateLocalKitchenOrderStatus(
  businessId: string,
  orderId: string,
  status: LocalKitchenOrder["status"]
): Promise<LocalKitchenOrder | null> {
  const db = getLocalDB();
  const order = await db.kitchenOrders.get(orderId);
  if (!order || order.businessId !== businessId) return null;
  const updated: LocalKitchenOrder = {
    ...order,
    status,
    updatedAt: new Date().toISOString(),
    syncedAt: null,
  };
  await db.kitchenOrders.put(updated);
  return updated;
}
