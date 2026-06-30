import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { listProductsForApi } from "@/lib/products";
import { getProductSchemaStatus, repairProductSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireBusinessDataAccess(["inventory", "sales"]);

    const schema = await getProductSchemaStatus();
    if (!schema.ok) {
      console.warn(
        "[api/products] Schema mismatch — missing:",
        schema.missing.join(", ")
      );
      await repairProductSchema();
    }

    const products = await listProductsForApi(ctx.businessId);
    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { products: [], error: "Unauthorized" },
        { status: 401 }
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
