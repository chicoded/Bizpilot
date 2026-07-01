import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { getAppNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireBusinessContext();
    const notifications = await getAppNotifications(ctx.businessId);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }
}
