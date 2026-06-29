"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { businessSchema, productSchema, expenseSchema, saleSchema } from "@/lib/validations";
import { syncClerkUser, requireBusinessContext } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function createBusiness(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await syncClerkUser({
    id: user.id,
    emailAddresses: user.emailAddresses,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  });

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    currency: formData.get("currency") || "NGN",
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const business = await prisma.business.create({
    data: {
      ...parsed.data,
      memberships: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
      subscription: {
        create: {
          plan: "STARTER",
          status: "TRIAL",
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      userId: user.id,
      action: "business.created",
      entity: "business",
      entityId: business.id,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, businessId: business.id };
}

export async function createProduct(formData: FormData) {
  const ctx = await requireBusinessContext();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    category: formData.get("category") || undefined,
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    quantity: formData.get("quantity"),
    reorderLevel: formData.get("reorderLevel"),
    batchNumber: formData.get("batchNumber") || undefined,
    expiryDate: formData.get("expiryDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { expiryDate, ...rest } = parsed.data;

  const product = await prisma.product.create({
    data: {
      ...rest,
      businessId: ctx.businessId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  revalidatePath("/inventory");
  return { success: true, product };
}

export async function createExpense(formData: FormData) {
  const ctx = await requireBusinessContext();
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    date: formData.get("date") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: ctx.businessId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      createdBy: ctx.userId,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true, expense };
}

export async function createSale(data: {
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  customerId?: string;
  discount?: number;
  tax?: number;
  isCredit?: boolean;
}) {
  const ctx = await requireBusinessContext();
  const parsed = saleSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid sale data" };
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: parsed.data.items.map((i) => i.productId) },
      businessId: ctx.businessId,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let totalCost = 0;
  const saleItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const sellingPrice = Number(product.sellingPrice);
    const cost = Number(product.purchasePrice);
    const lineTotal = sellingPrice * item.quantity;
    subtotal += lineTotal;
    totalCost += cost * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      cost,
      sellingPrice,
      total: lineTotal,
    };
  });

  const discount = parsed.data.discount ?? 0;
  const tax = parsed.data.tax ?? 0;
  const total = subtotal - discount + tax;
  const profit = total - totalCost - discount;

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        businessId: ctx.businessId,
        customerId: parsed.data.customerId,
        paymentMethod: parsed.data.paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        profit,
        isCredit: parsed.data.isCredit ?? false,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdBy: ctx.userId,
        items: { create: saleItems },
      },
      include: { items: true },
    });

    for (const item of parsed.data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockAdjustment.create({
        data: {
          productId: item.productId,
          businessId: ctx.businessId,
          type: "SALE",
          quantity: -item.quantity,
          createdBy: ctx.userId,
        },
      });
    }

    if (parsed.data.isCredit && parsed.data.customerId) {
      await tx.customer.update({
        where: { id: parsed.data.customerId },
        data: {
          debt: { increment: total },
          lastPurchase: new Date(),
          lifetimeValue: { increment: total },
        },
      });
    } else if (parsed.data.customerId) {
      await tx.customer.update({
        where: { id: parsed.data.customerId },
        data: {
          lastPurchase: new Date(),
          lifetimeValue: { increment: total },
        },
      });
    }

    return newSale;
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  return { success: true, sale };
}

export async function sendAIMessage(message: string) {
  const ctx = await requireBusinessContext();
  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });
  const { canAccessFeature } = await import("@/lib/subscription");
  if (!canAccessFeature(subscription, "ai")) {
    return {
      error:
        "AI Assistant requires the AI Pro plan. Upgrade at Settings → Billing.",
    };
  }
  const { chatWithAI } = await import("@/ai/assistant");
  const response = await chatWithAI(ctx.businessId, message);
  return { response };
}
