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
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.kitchenOrder
    .findMany({
      where: {
        businessId: ctx.businessId,
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    .catch(() => []);

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      businessId: o.businessId,
      saleId: o.saleId,
      orderNumber: o.orderNumber,
      serviceType: o.serviceType,
      status: o.status,
      notes: o.notes,
      items: o.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        notes: i.notes,
      })),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      syncedAt: new Date().toISOString(),
    })),
  });
}
