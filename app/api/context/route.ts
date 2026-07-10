import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireBusinessDataAccess(["dashboard"]);
    return NextResponse.json({
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      currency: ctx.business.currency ?? "NGN",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
