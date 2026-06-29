import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { getFullReport } from "@/services/reports";
import type { ReportPeriod } from "@/types";

const VALID_PERIODS: ReportPeriod[] = ["today", "week", "month", "quarter", "year"];

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessContext();
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as ReportPeriod) || "month";

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const report = await getFullReport(ctx.businessId, period);
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
