"use server";

import { revalidatePath } from "next/cache";
import { requireSectionAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateReceivedTotal,
  parsePurchaseOrderItems,
  serializePurchaseOrderItems,
  type PurchaseOrderLineItem,
} from "@/lib/purchase-orders";
import {
  receivePurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
} from "@/lib/validations";
import { updateInventoryProduct } from "@/lib/products";

function revalidatePurchaseOrderPaths(orderId: string, supplierId: string) {
  revalidatePath("/suppliers/orders");
  revalidatePath(`/suppliers/orders/${orderId}`);
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function updatePurchaseOrderStatus(data: {
  orderId: string;
  status: "ordered" | "cancelled";
}) {
  const ctx = await requireSectionAccess("suppliers");
  const parsed = updatePurchaseOrderStatusSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid status update" };
  }

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: parsed.data.orderId, businessId: ctx.businessId },
    select: { id: true, status: true, supplierId: true },
  });

  if (!order) {
    return { error: "Purchase order not found" };
  }

  if (!["requested", "ordered", "pending"].includes(order.status)) {
    return { error: "This order can no longer be updated" };
  }

  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status: parsed.data.status },
  });

  revalidatePurchaseOrderPaths(order.id, order.supplierId);
  return { success: true };
}

export async function receivePurchaseOrder(data: {
  orderId: string;
  lines: { productId: string; quantityReceived: number }[];
}) {
  const ctx = await requireSectionAccess("suppliers");
  const parsed = receivePurchaseOrderSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid receive details" };
  }

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: parsed.data.orderId, businessId: ctx.businessId },
    select: {
      id: true,
      status: true,
      supplierId: true,
      items: true,
    },
  });

  if (!order) {
    return { error: "Purchase order not found" };
  }

  if (!["requested", "ordered", "pending"].includes(order.status)) {
    return { error: "This order has already been received or cancelled" };
  }

  const existingItems = parsePurchaseOrderItems(order.items);
  if (existingItems.length === 0) {
    return {
      error:
        "This order has no line items. Mark it as received from the status menu instead.",
    };
  }

  const receivedByProduct = new Map(
    parsed.data.lines.map((line) => [line.productId, line.quantityReceived])
  );

  const updatedItems: PurchaseOrderLineItem[] = existingItems.map((item) => ({
    ...item,
    quantityReceived:
      receivedByProduct.get(item.productId) ?? item.quantityReceived,
  }));

  const hasReceipt = updatedItems.some((item) => item.quantityReceived > 0);
  if (!hasReceipt) {
    return { error: "Enter at least one received quantity" };
  }

  const productIds = updatedItems
    .filter((item) => item.quantityReceived > 0)
    .map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: {
      businessId: ctx.businessId,
      id: { in: productIds },
      isActive: true,
    },
    select: { id: true, quantity: true },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of updatedItems) {
    if (item.quantityReceived > 0 && !productMap.has(item.productId)) {
      return { error: `Product not found: ${item.productName}` };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of updatedItems) {
      if (item.quantityReceived <= 0) continue;

      await updateInventoryProduct(
        item.productId,
        { quantity: { increment: item.quantityReceived } },
        tx
      );

      await tx.stockAdjustment.create({
        data: {
          productId: item.productId,
          businessId: ctx.businessId,
          type: "PURCHASE",
          quantity: item.quantityReceived,
          reason: `Purchase order ${order.id}`,
          createdBy: ctx.userId,
        },
      });
    }

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: "received",
        items: serializePurchaseOrderItems(updatedItems),
        total: calculateReceivedTotal(updatedItems),
      },
    });
  });

  revalidatePurchaseOrderPaths(order.id, order.supplierId);
  return { success: true };
}

export async function markPurchaseOrderReceivedWithoutStock(orderId: string) {
  const ctx = await requireSectionAccess("suppliers");

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId: ctx.businessId },
    select: { id: true, status: true, supplierId: true, items: true },
  });

  if (!order) {
    return { error: "Purchase order not found" };
  }

  if (!["requested", "ordered", "pending"].includes(order.status)) {
    return { error: "This order has already been received or cancelled" };
  }

  const items = parsePurchaseOrderItems(order.items);
  const updatedItems =
    items.length > 0
      ? items.map((item) => ({
          ...item,
          quantityReceived: item.quantityOrdered,
        }))
      : [];

  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status: "received",
      ...(updatedItems.length > 0
        ? {
            items: serializePurchaseOrderItems(updatedItems),
            total: calculateReceivedTotal(updatedItems),
          }
        : {}),
    },
  });

  revalidatePurchaseOrderPaths(order.id, order.supplierId);
  return { success: true };
}
