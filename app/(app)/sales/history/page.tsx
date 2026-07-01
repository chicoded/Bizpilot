import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { listSales, type SalePeriod } from "@/lib/sales";
import { AppShell } from "@/components/layout/app-shell";
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
    <AppShell
      title="Sales History"
      subtitle={`${count} transactions`}
      maxWidth="narrow"
      className="space-y-4"
    >
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
    </AppShell>
  );
}
