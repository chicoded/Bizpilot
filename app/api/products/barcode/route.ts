import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function barcodeLookupVariants(code: string): string[] {
  const trimmed = code.trim();
  const variants = new Set<string>([trimmed]);

  if (/^\d{13}$/.test(trimmed) && trimmed.startsWith("0")) {
    variants.add(trimmed.slice(1));
  }
  if (/^\d{12}$/.test(trimmed)) {
    variants.add(`0${trimmed}`);
  }

  return [...variants];
}

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessContext();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

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
