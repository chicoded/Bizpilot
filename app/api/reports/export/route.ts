import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFullReport } from "@/services/reports";
import { generateExcelBuffer, generatePdfBuffer } from "@/lib/export";
import { canAccessFeature } from "@/lib/subscription";
import type { ReportPeriod } from "@/types";
import { format } from "date-fns";

const VALID_PERIODS: ReportPeriod[] = ["today", "week", "month", "quarter", "year"];

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessContext();
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as ReportPeriod) || "month";
    const formatType = searchParams.get("format") ?? "pdf";

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    if (formatType !== "pdf" && formatType !== "excel") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: ctx.businessId },
    });
    if (!canAccessFeature(subscription, "export")) {
      return NextResponse.json(
        { error: "Report export requires Business plan or higher" },
        { status: 403 }
      );
    }

    const report = await getFullReport(ctx.businessId, period);
    const slug = ctx.business.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const dateSlug = format(new Date(), "yyyy-MM-dd");

    if (formatType === "excel") {
      const buffer = generateExcelBuffer(report, ctx.business.name);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="bizpilot-${slug}-${period}-${dateSlug}.xlsx"`,
        },
      });
    }

    const buffer = generatePdfBuffer(report, ctx.business.name);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bizpilot-${slug}-${period}-${dateSlug}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 401 });
  }
}
