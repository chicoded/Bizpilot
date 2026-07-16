"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { setActiveBusinessId } from "@/lib/active-business";

export async function listMyBusinessMemberships() {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await prisma.membership.findMany({
    where: { userId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          _count: { select: { products: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((m) => ({
    businessId: m.businessId,
    businessName: m.business.name,
    role: m.role,
    productCount: m.business._count.products,
  }));
}

export async function switchActiveBusiness(businessId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_businessId: { userId, businessId },
    },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return { error: "You are not a member of that business" };
  }

  await setActiveBusinessId(businessId);
  revalidatePath("/", "layout");
  return {
    ok: true as const,
    businessId: membership.business.id,
    businessName: membership.business.name,
    role: membership.role,
  };
}
