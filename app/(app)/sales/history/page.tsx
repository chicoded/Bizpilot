import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { listSales, type SalePeriod } from "@/lib/sales";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SalesHistoryPanel } from "@/features/sales/sales-history-panel";
import { ShoppingCart } from "lucide-react";

function parsePeriod(value: string | undefined): SalePeriod {
  if (value === "today" || value === "week" || value === "month" || value === "all") {
    return value;
  }
  return "month";
}

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const ctx = await requirePageAccess("sales_history");

  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const { sales, totalRevenue, totalProfit, count } = await listSales(
    ctx.businessId,
    period
  );

  return (
    <>
      <Header title="Sales History" subtitle={`${count} transactions`} />
      <main className="p-4 md:p-6 max-w-2xl mx-auto mobile-page space-y-4">
        <Button size="lg" className="w-full" asChild>
          <Link href="/sales">
            <ShoppingCart className="h-5 w-5" />
            New Sale
          </Link>
        </Button>
        <SalesHistoryPanel
          sales={sales}
          totalRevenue={totalRevenue}
          totalProfit={totalProfit}
          count={count}
          currency={ctx.business.currency}
          period={period}
        />
      </main>
    </>
  );
}
