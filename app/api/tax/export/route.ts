import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { getTaxDashboard } from "@/services/tax";
import { prisma } from "@/lib/db";
import {
  generateTaxExcelBuffer,
  generateTaxPdfBuffer,
} from "@/lib/tax-export";

export async function GET(request: Request) {
  try {
    const ctx = await requireBusinessDataAccess(["tax"]);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "pdf";

    const [data, business] = await Promise.all([
      getTaxDashboard(ctx.businessId),
      prisma.business.findUnique({
        where: { id: ctx.businessId },
        select: { name: true },
      }),
    ]);

    const businessName = business?.name ?? "Business";

    if (format === "excel") {
      const buffer = generateTaxExcelBuffer(data, businessName);
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="tax-estimate.xlsx"',
        },
      });
    }

    const buffer = generateTaxPdfBuffer(data, businessName);
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="tax-estimate.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
