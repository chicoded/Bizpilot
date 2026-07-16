import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { listProductsForApi } from "@/lib/products";
import {
  getPosQuickPickProducts,
  searchProductsForPos,
} from "@/lib/pos-products";
import { getProductSchemaStatus, repairProductSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessDataAccess(["inventory", "sales"]);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const posMode = searchParams.get("pos") === "1";

    const schema = await getProductSchemaStatus();
    if (!schema.ok) {
      console.warn(
        "[api/products] Schema mismatch — missing:",
        schema.missing.join(", ")
      );
      await repairProductSchema();
    }

    if (query) {
      const products = await searchProductsForPos(ctx.businessId, query);
      return NextResponse.json({ products, mode: "search" });
    }

    if (posMode) {
      const { products, totalInStock } = await getPosQuickPickProducts(
        ctx.businessId
      );
      return NextResponse.json({ products, mode: "quick", totalInStock });
    }

    const products = await listProductsForApi(ctx.businessId);
    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Error && /Unauthorized|access/i.test(error.message)) {
      return NextResponse.json(
        { products: [], error: error.message },
        { status: error.message.includes("Unauthorized") ? 401 : 403 }
      );
    }

    console.error("[api/products] Failed to load products:", error);

    const schema = await getProductSchemaStatus().catch(() => null);
    const schemaHint = schema && !schema.ok
      ? `Database missing columns: ${schema.missing.join(", ")}. Use Fix Database on the inventory page.`
      : "Could not load products. Please try again.";

    return NextResponse.json(
      { products: [], error: schemaHint },
      { status: 500 }
    );
  }
}
