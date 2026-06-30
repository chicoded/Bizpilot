import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { barcodeLookupVariants, normalizeBarcode } from "@/lib/barcode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessContext();
    const { searchParams } = new URL(request.url);
    const code = normalizeBarcode(searchParams.get("code") ?? "");

    if (!code) {
      return NextResponse.json({ error: "Barcode required" }, { status: 400 });
    }

    const variants = barcodeLookupVariants(code);

    const product = await prisma.product.findFirst({
      where: {
        businessId: ctx.businessId,
        isActive: true,
        barcode: { in: variants },
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        quantity: true,
        barcode: true,
      },
    });

    if (!product) {
      return NextResponse.json({ product: null });
    }

    return NextResponse.json({
      product: {
        ...product,
        sellingPrice: Number(product.sellingPrice),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
