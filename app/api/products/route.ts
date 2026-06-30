import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { listProductsForApi } from "@/lib/products";

export async function GET() {
  try {
    const ctx = await requireBusinessContext();
    const products = await listProductsForApi(ctx.businessId);

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] }, { status: 401 });
  }
}
