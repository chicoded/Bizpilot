import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * "Has anything changed?" — the cheapest possible answer.
 *
 * The team sync used to re-download the whole catalogue and the last fifty
 * sales every twenty-five seconds, whether or not a single row had moved. At
 * roughly 105 KB a poll that is about 3.5 GB per device per month, which is
 * what exhausted the hosting transfer quota with no growth in customers behind
 * it.
 *
 * This returns two timestamps and two counts — about sixty bytes. The client
 * compares them with what it saw last time and only does the expensive pull
 * when they differ, which on a normal shop is a small fraction of polls.
 *
 * Counts sit alongside the timestamps because a deletion moves the count
 * without moving any updatedAt.
 */
export async function GET() {
  try {
    const ctx = await requireBusinessDataAccess(["inventory", "sales"]);
    const businessId = ctx.businessId;

    const [product, sale, productCount, saleCount] = await Promise.all([
      prisma.product.aggregate({
        where: { businessId },
        _max: { updatedAt: true },
      }),
      prisma.sale.aggregate({
        where: { businessId },
        _max: { createdAt: true },
      }),
      prisma.product.count({ where: { businessId } }),
      prisma.sale.count({ where: { businessId } }),
    ]);

    return NextResponse.json(
      {
        products: product._max.updatedAt?.toISOString() ?? null,
        productCount,
        sales: sale._max.createdAt?.toISOString() ?? null,
        saleCount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[sync/state]", error);
    // A failure here must not stop syncing. The caller treats any error as
    // "assume something changed" and does the full pull, which is the safe
    // direction to fail in.
    return NextResponse.json({ error: "state unavailable" }, { status: 503 });
  }
}
