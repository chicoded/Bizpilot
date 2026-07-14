import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBusinessContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getBusinessContext();
  if (!ctx) {
    // Signed in but still onboarding — not an auth failure.
    return NextResponse.json({
      businessId: null,
      businessName: null,
      currency: "NGN",
    });
  }

  return NextResponse.json({
    businessId: ctx.businessId,
    businessName: ctx.business.name,
    currency: ctx.business.currency ?? "NGN",
  });
}
