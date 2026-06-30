import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const ctx = await requireBusinessDataAccess(["customers", "sales", "debts"]);
    const customers = await prisma.customer.findMany({
      where: { businessId: ctx.businessId },
      select: {
        id: true,
        name: true,
        phone: true,
        debt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        ...c,
        debt: Number(c.debt),
      })),
    });
  } catch {
    return NextResponse.json({ customers: [] }, { status: 401 });
  }
}
