import type { Prisma } from "@prisma/client";

export type PurchaseOrderStatus =
  | "requested"
  | "ordered"
  | "received"
  | "cancelled"
  | "pending";

export type PurchaseOrderLineItem = {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
};

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrderStatus,
  string
> = {
  requested: "Requested",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
  pending: "Pending",
};

export function parsePurchaseOrderItems(
  value: Prisma.JsonValue | null | undefined
): PurchaseOrderLineItem[] {
  if (!value || !Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const item = entry as Record<string, unknown>;
      const productId = typeof item.productId === "string" ? item.productId : "";
      const productName =
        typeof item.productName === "string" ? item.productName : "Product";
      const quantityOrdered = Number(item.quantityOrdered ?? 0);
      const quantityReceived = Number(item.quantityReceived ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);

      if (!productId || quantityOrdered <= 0) return null;

      return {
        productId,
        productName,
        quantityOrdered,
        quantityReceived,
        unitPrice,
      };
    })
    .filter((item): item is PurchaseOrderLineItem => item !== null);
}

export function serializePurchaseOrderItems(
  items: PurchaseOrderLineItem[]
): Prisma.InputJsonValue {
  return items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    quantityOrdered: item.quantityOrdered,
    quantityReceived: item.quantityReceived,
    unitPrice: item.unitPrice,
  }));
}

export function countLineItems(
  value: Prisma.JsonValue | null | undefined
): number {
  return parsePurchaseOrderItems(value).length;
}

export function calculateReceivedTotal(items: PurchaseOrderLineItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantityReceived,
    0
  );
}
