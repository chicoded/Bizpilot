"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth";
import { isRushPosIndustry } from "@/lib/rush-pos/constants";

export async function getOrCreateRestaurantSettings(businessId?: string) {
  const ctx = await requireBusinessContext(businessId);
  const existing = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
  });
  if (existing) return existing;

  const enabled = isRushPosIndustry(ctx.business.industry);
  return prisma.restaurantSettings.create({
    data: {
      businessId: ctx.businessId,
      rushModeEnabled: enabled,
      aiSuggestionsEnabled: true,
      comboMealsEnabled: true,
      kitchenDisplayEnabled: true,
      voiceOrdersEnabled: false,
    },
  });
}

export async function updateRestaurantSettings(input: {
  rushModeEnabled?: boolean;
  voiceOrdersEnabled?: boolean;
  aiSuggestionsEnabled?: boolean;
  comboMealsEnabled?: boolean;
  kitchenDisplayEnabled?: boolean;
}) {
  const ctx = await requireBusinessContext();
  const settings = await getOrCreateRestaurantSettings(ctx.businessId);
  const updated = await prisma.restaurantSettings.update({
    where: { id: settings.id },
    data: {
      ...(input.rushModeEnabled !== undefined
        ? { rushModeEnabled: input.rushModeEnabled }
        : {}),
      ...(input.voiceOrdersEnabled !== undefined
        ? { voiceOrdersEnabled: input.voiceOrdersEnabled }
        : {}),
      ...(input.aiSuggestionsEnabled !== undefined
        ? { aiSuggestionsEnabled: input.aiSuggestionsEnabled }
        : {}),
      ...(input.comboMealsEnabled !== undefined
        ? { comboMealsEnabled: input.comboMealsEnabled }
        : {}),
      ...(input.kitchenDisplayEnabled !== undefined
        ? { kitchenDisplayEnabled: input.kitchenDisplayEnabled }
        : {}),
    },
  });
  revalidatePath("/sales");
  revalidatePath("/settings/profile");
  revalidatePath("/sales/kitchen");
  revalidatePath("/sales/rush-setup");
  return { ok: true as const, settings: updated };
}

export async function listMealCombosForBusiness(includeInactive = false) {
  const ctx = await requireBusinessContext();
  return prisma.mealCombo.findMany({
    where: {
      businessId: ctx.businessId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              quantity: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listFavoriteProductIds() {
  const ctx = await requireBusinessContext();
  const rows = await prisma.favoriteProduct.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { sortOrder: "asc" },
    take: 20,
  });
  return rows.map((r) => r.productId);
}

export async function setFavoriteProducts(productIds: string[]) {
  const ctx = await requireBusinessContext();
  const unique = [...new Set(productIds)].slice(0, 20);

  await prisma.$transaction(async (tx) => {
    await tx.favoriteProduct.deleteMany({ where: { businessId: ctx.businessId } });
    if (unique.length === 0) return;
    await tx.favoriteProduct.createMany({
      data: unique.map((productId, index) => ({
        businessId: ctx.businessId,
        productId,
        sortOrder: index,
      })),
    });
  });

  revalidatePath("/sales");
  revalidatePath("/sales/rush-setup");
  return { ok: true as const, count: unique.length };
}

export async function createMealCombo(input: {
  name: string;
  description?: string;
  price: number;
  productIds: string[];
}) {
  const ctx = await requireBusinessContext();
  const name = input.name.trim();
  if (!name) return { error: "Combo name is required" };
  if (input.productIds.length === 0) return { error: "Add at least one product" };
  if (!(input.price > 0)) return { error: "Price must be greater than zero" };

  const products = await prisma.product.findMany({
    where: {
      businessId: ctx.businessId,
      id: { in: input.productIds },
      isActive: true,
    },
    select: { id: true },
  });
  if (products.length !== input.productIds.length) {
    return { error: "One or more products were not found" };
  }

  const combo = await prisma.mealCombo.create({
    data: {
      businessId: ctx.businessId,
      name,
      description: input.description?.trim() || null,
      price: input.price,
      isActive: true,
      items: {
        create: input.productIds.map((productId) => ({
          productId,
          quantity: 1,
        })),
      },
    },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/rush-setup");
  return { ok: true as const, id: combo.id };
}

export async function deactivateMealCombo(comboId: string) {
  const ctx = await requireBusinessContext();
  await prisma.mealCombo.updateMany({
    where: { id: comboId, businessId: ctx.businessId },
    data: { isActive: false },
  });
  revalidatePath("/sales");
  revalidatePath("/sales/rush-setup");
  return { ok: true as const };
}

export async function listActiveKitchenOrders() {
  const ctx = await requireBusinessContext();
  return prisma.kitchenOrder.findMany({
    where: {
      businessId: ctx.businessId,
      status: { in: ["PENDING", "PREPARING", "READY"] },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createKitchenOrderFromSale(input: {
  saleId: string;
  orderNumber: string;
  serviceType: "WALK_IN" | "DINE_IN" | "PICKUP" | "DELIVERY";
  notes?: string;
  items: { productId: string; productName: string; quantity: number; notes?: string }[];
}) {
  const ctx = await requireBusinessContext();
  try {
    const order = await prisma.kitchenOrder.upsert({
      where: {
        businessId_orderNumber: {
          businessId: ctx.businessId,
          orderNumber: input.orderNumber,
        },
      },
      update: {
        saleId: input.saleId,
        serviceType: input.serviceType,
        notes: input.notes,
      },
      create: {
        businessId: ctx.businessId,
        saleId: input.saleId,
        orderNumber: input.orderNumber,
        serviceType: input.serviceType,
        notes: input.notes,
        status: "PENDING",
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });
    revalidatePath("/sales/kitchen");
    return { ok: true as const, order };
  } catch (error) {
    console.error("[kitchen-order]", error);
    return { ok: false as const, error: "Could not create kitchen ticket" };
  }
}

export async function updateKitchenOrderStatus(
  orderId: string,
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED",
  orderNumber?: string
) {
  const ctx = await requireBusinessContext();
  const data: {
    status: typeof status;
    readyAt?: Date;
    completedAt?: Date;
  } = { status };
  if (status === "READY") data.readyAt = new Date();
  if (status === "COMPLETED") data.completedAt = new Date();

  const byId = await prisma.kitchenOrder.updateMany({
    where: { id: orderId, businessId: ctx.businessId },
    data,
  });

  if (byId.count === 0 && orderNumber) {
    await prisma.kitchenOrder.updateMany({
      where: { businessId: ctx.businessId, orderNumber },
      data,
    });
  }

  revalidatePath("/sales/kitchen");
  return { ok: true as const };
}
