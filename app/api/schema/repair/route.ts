import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  getProductSchemaStatus,
  repairProductSchema,
} from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOwner();
    const status = await getProductSchemaStatus();

    return NextResponse.json({
      ok: status.ok,
      missing: status.missing,
      present: status.present,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("owner")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    await requireOwner();

    const before = await getProductSchemaStatus();
    if (before.ok) {
      return NextResponse.json({
        ok: true,
        schema: "ok",
        message: "Database schema is ready for inventory.",
        repaired: [],
        missing: [],
      });
    }

    console.warn("[schema/repair] Missing columns:", before.missing.join(", "));

    const result = await repairProductSchema();

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        schema: "ok",
        message: "Database update required — repair completed successfully.",
        repaired: result.repaired,
        missing: [],
      });
    }

    return NextResponse.json(
      {
        ok: false,
        schema: "error",
        message:
          "Database update required. Auto-repair failed — run database/repair-product-schema.sql in Supabase.",
        repaired: result.repaired,
        stillMissing: result.stillMissing,
        errors: result.errors,
      },
      { status: 503 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("owner")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("[schema/repair] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Repair failed unexpectedly." },
      { status: 500 }
    );
  }
}
