"use server";

import { revalidatePath } from "next/cache";
import { requireSectionAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractPhoneFromContact, toWhatsAppWebUrl } from "@/lib/phone";
import { formatSupplyRequestMessage } from "@/lib/supply-request";
import { serializePurchaseOrderItems } from "@/lib/purchase-orders";
import { supplyRequestSchema } from "@/lib/validations";

export async function sendSupplyRequest(data: {
  supplierId: string;
  items: { productId: string; quantity: number }[];
  customMessage?: string;
  notes?: string;
}) {
  const ctx = await requireSectionAccess("suppliers");
  const parsed = supplyRequestSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.customMessage?.[0] ??
        parsed.error.flatten().fieldErrors.supplierId?.[0] ??
        "Invalid supply request",
    };
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: parsed.data.supplierId, businessId: ctx.businessId },
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          quantity: true,
          purchasePrice: true,
        },
      },
    },
  });

  if (!supplier) {
    return { error: "Supplier not found" };
  }

  const phone = extractPhoneFromContact(supplier.contact);
  if (!phone) {
    return {
      error:
        "Add a phone number to this supplier's contact field (e.g. 08012345678).",
    };
  }

  const productMap = new Map(supplier.products.map((p) => [p.id, p]));
  const requestItems = [];

  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { error: `Product not found for this supplier` };
    }
    requestItems.push({
      productId: item.productId,
      name: product.name,
      quantity: item.quantity,
      currentStock: product.quantity,
      unitPrice: Number(product.purchasePrice),
    });
  }

  const message = formatSupplyRequestMessage({
    businessName: ctx.business.name,
    businessPhone: ctx.business.phone,
    supplierName: supplier.name,
    items: requestItems,
    customMessage: parsed.data.customMessage,
    notes: parsed.data.notes,
    currency: ctx.business.currency,
  });

  const estimatedTotal = requestItems.reduce(
    (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
    0
  );

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      businessId: ctx.businessId,
      supplierId: supplier.id,
      status: "requested",
      notes: message,
      total: estimatedTotal,
      items: serializePurchaseOrderItems(
        requestItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          quantityOrdered: item.quantity,
          quantityReceived: 0,
          unitPrice: item.unitPrice,
        }))
      ),
    },
  });

  revalidatePath(`/suppliers/${supplier.id}`);
  revalidatePath("/suppliers");
  revalidatePath("/suppliers/orders");

  return {
    success: true,
    whatsAppUrl: toWhatsAppWebUrl(phone, message),
    purchaseOrderId: purchaseOrder.id,
  };
}
