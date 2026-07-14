"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalData } from "@/components/providers/local-data-provider";
import { getLocalFullReport } from "@/lib/local-data/reports";
import { ReportPeriodFilter } from "@/features/reports/report-period-filter";
import { ReportSummaryCards } from "@/features/reports/report-summary-cards";
import { TopProductsTable } from "@/features/reports/top-products-table";
import { InventoryValuationCard } from "@/features/reports/inventory-valuation-card";
import { formatCurrency } from "@/lib/utils";
import type { ReportPeriod } from "@/types";
import { HardDrive } from "lucide-react";

const SalesTrendChart = dynamic(
  () =>
    import("@/features/reports/sales-trend-chart").then(
      (mod) => mod.SalesTrendChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 rounded-2xl" />,
  }
);

const ExpenseBreakdownChart = dynamic(
  () =>
    import("@/features/reports/expense-breakdown-chart").then(
      (mod) => mod.ExpenseBreakdownChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 rounded-2xl" />,
  }
);

function parsePeriod(value: string | null): ReportPeriod {
  if (
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "quarter" ||
    value === "year"
  ) {
    return value;
  }
  return "today";
}

export function ReportsPageClient() {
  const { businessId, currency, status } = useLocalData();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const [report, setReport] = useState<Awaited<
    ReturnType<typeof getLocalFullReport>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setReport(await getLocalFullReport(businessId, period));
    } finally {
      setLoading(false);
    }
  }, [businessId, period]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading" || !report) {
    return (
      <AppShell title="Reports" subtitle="Loading local day close…">
        <Skeleton className="h-64 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Reports"
      subtitle={`${report.periodLabel} · from this device`}
      className="space-y-6"
    >
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <HardDrive className="h-4 w-4 shrink-0 text-primary" />
        Day-close and reports use sales saved on this phone. Works offline.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Suspense fallback={<Skeleton className="h-11 w-64 rounded-xl" />}>
          <ReportPeriodFilter />
        </Suspense>
      </div>

      <ReportSummaryCards summary={report.summary} currency={currency} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment mix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.paymentMix.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            report.paymentMix.map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.count} sale{row.count === 1 ? "" : "s"} ·{" "}
                    {row.percentage.toFixed(0)}%
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(row.revenue, currency)}
                </p>
              </div>
            ))
          )}
          {report.creditSalesCount > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 pt-2 border-t">
              Credit: {report.creditSalesCount} sale
              {report.creditSalesCount === 1 ? "" : "s"} ·{" "}
              {formatCurrency(report.creditRevenue, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesTrendChart data={report.dailyTrend} />
        <ExpenseBreakdownChart data={report.expenseBreakdown} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsTable products={report.topProducts} currency={currency} />
        <InventoryValuationCard
          items={report.inventoryValuation}
          totals={report.inventoryTotals}
          currency={currency}
        />
      </div>
    </AppShell>
  );
}
