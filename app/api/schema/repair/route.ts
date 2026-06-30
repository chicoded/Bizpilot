import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import {
  checkProductImageColumn,
  ensureProductImageColumn,
} from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireBusinessContext();

    const repaired = await ensureProductImageColumn();
    const schemaOk = repaired ? await checkProductImageColumn() : false;

    return NextResponse.json({
      ok: schemaOk,
      schema: schemaOk ? "ok" : "error",
      message: schemaOk
        ? "Database schema is ready for inventory."
        : "Could not add the imageUrl column. Run the SQL in Supabase SQL Editor.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
