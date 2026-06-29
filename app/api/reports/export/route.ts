import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFullReport } from "@/services/reports";
import {
  generateExcelBuffer,
  generatePdfBuffer,
  toExportBlob,
} from "@/lib/export";
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
      const bytes = generateExcelBuffer(report, ctx.business.name);
      const mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      return new NextResponse(toExportBlob(bytes, mimeType), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="bizpilot-${slug}-${period}-${dateSlug}.xlsx"`,
        },
      });
    }

    const bytes = generatePdfBuffer(report, ctx.business.name);
    const mimeType = "application/pdf";
    return new NextResponse(toExportBlob(bytes, mimeType), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="bizpilot-${slug}-${period}-${dateSlug}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 401 });
  }
}
