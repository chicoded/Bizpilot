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
  return { ok: true as const, settings: updated };
}

export async function listMealCombosForBusiness() {
  const ctx = await requireBusinessContext();
  return prisma.mealCombo.findMany({
    where: { businessId: ctx.businessId, isActive: true },
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

export async function createKitchenOrderFromSale(input: {
  saleId: string;
  orderNumber: string;
  serviceType: "WALK_IN" | "DINE_IN" | "PICKUP" | "DELIVERY";
  notes?: string;
  items: { productId: string; productName: string; quantity: number; notes?: string }[];
}) {
  const ctx = await requireBusinessContext();
  try {
    const order = await prisma.kitchenOrder.create({
      data: {
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
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
) {
  const ctx = await requireBusinessContext();
  const data: {
    status: typeof status;
    readyAt?: Date;
    completedAt?: Date;
  } = { status };
  if (status === "READY") data.readyAt = new Date();
  if (status === "COMPLETED") data.completedAt = new Date();

  await prisma.kitchenOrder.updateMany({
    where: { id: orderId, businessId: ctx.businessId },
    data,
  });
  revalidatePath("/sales/kitchen");
  return { ok: true as const };
}
