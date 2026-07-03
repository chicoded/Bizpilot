import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";
import { getMonthlySalesReport } from "@/services/monthly-sales-report";
import { parseMonthKey } from "@/lib/monthly-report-months";
import { generateMonthlySalesPdfBuffer } from "@/lib/monthly-sales-pdf";
import { toExportBlob } from "@/lib/export";
import { canAccessFeature } from "@/lib/subscription";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessDataAccess(["reports"]);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? format(new Date(), "yyyy-MM");

    if (!parseMonthKey(month)) {
      return NextResponse.json(
        { error: "Invalid month. Use YYYY-MM format." },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: ctx.businessId },
    });
    if (!canAccessFeature(subscription, "export")) {
      return NextResponse.json(
        {
          error:
            "Monthly sales PDF requires Business plan or higher. Upgrade at Settings → Billing.",
        },
        { status: 403 }
      );
    }

    const report = await getMonthlySalesReport(ctx.businessId, month);
    const bytes = generateMonthlySalesPdfBuffer(report);
    const slug = ctx.business.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const mimeType = "application/pdf";

    return new NextResponse(toExportBlob(bytes, mimeType), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="bizpilot-${slug}-sales-${month}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 401 });
  }
}
