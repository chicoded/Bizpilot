import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getBusinessContext();
  if (!ctx) {
    return NextResponse.json({
      businessId: null,
      businessName: null,
      currency: "NGN",
      role: null,
      memberships: [],
    });
  }

  const memberships = await prisma.membership
    .findMany({
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
    })
    .catch(() => []);

  const productCount = await prisma.product
    .count({
      where: { businessId: ctx.businessId, isActive: true },
    })
    .catch(() => 0);

  return NextResponse.json({
    businessId: ctx.businessId,
    businessName: ctx.business.name,
    currency: ctx.business.currency ?? "NGN",
    industry: ctx.business.industry ?? "OTHER",
    role: ctx.role,
    productCount,
    memberships: memberships.map((m) => ({
      businessId: m.businessId,
      businessName: m.business.name,
      role: m.role,
      productCount: m.business._count.products,
    })),
  });
}
