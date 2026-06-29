import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const ctx = await requireBusinessContext();
    const products = await prisma.product.findMany({
      where: { businessId: ctx.businessId, isActive: true },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        quantity: true,
        barcode: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        sellingPrice: Number(p.sellingPrice),
      })),
    });
  } catch {
    return NextResponse.json({ products: [] }, { status: 401 });
  }
}
