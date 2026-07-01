import { prisma } from "@/lib/db";
import {
  countLineItems,
  parsePurchaseOrderItems,
} from "@/lib/purchase-orders";

export async function listPurchaseOrders(businessId: string) {
  const orders = await prisma.purchaseOrder.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    supplier: order.supplier,
    itemCount: countLineItems(order.items),
    hasItems: countLineItems(order.items) > 0,
  }));
}

export async function getPurchaseOrder(businessId: string, orderId: string) {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId },
    include: {
      supplier: {
        select: { id: true, name: true, contact: true },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    supplier: {
      id: order.supplier.id,
      name: order.supplier.name,
      contact: order.supplier.contact,
    },
    items: parsePurchaseOrderItems(order.items),
  };
}

export type PurchaseOrderDetail = NonNullable<
  Awaited<ReturnType<typeof getPurchaseOrder>>
>;

export type PurchaseOrderListItem = Awaited<
  ReturnType<typeof listPurchaseOrders>
>[number];
