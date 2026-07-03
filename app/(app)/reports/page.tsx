import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import {
  getFullReport,
  getWeeklyComparison,
  getMonthlyTrend,
} from "@/services/reports";
import { ReportPeriodFilter } from "@/features/reports/report-period-filter";
import { ExportButtons } from "@/features/reports/export-buttons";
import { MonthlySalesReportCard } from "@/features/reports/monthly-sales-report-card";
import { ReportSummaryCards } from "@/features/reports/report-summary-cards";
import { SalesTrendChart } from "@/features/reports/sales-trend-chart";
import { MonthlyTrendChart } from "@/features/reports/monthly-trend-chart";
import { ExpenseBreakdownChart } from "@/features/reports/expense-breakdown-chart";
import { TopProductsTable } from "@/features/reports/top-products-table";
import { InventoryValuationCard } from "@/features/reports/inventory-valuation-card";
import { canAccessFeature } from "@/lib/subscription";
import type { ReportPeriod } from "@/types";
import { format } from "date-fns";

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const ctx = await requirePageAccess("reports");

  const params = await searchParams;
  const period = (params.period as ReportPeriod) || "month";

  const [report, weeklyComparison, monthlyTrend, subscription] =
    await Promise.all([
      getFullReport(ctx.businessId, period),
      getWeeklyComparison(ctx.businessId),
      getMonthlyTrend(ctx.businessId),
      prisma.subscription.findUnique({
        where: { businessId: ctx.businessId },
      }),
    ]);

  const canExport = canAccessFeature(subscription, "export");
  const currentMonth = format(new Date(), "yyyy-MM");

  return (
    <AppShell title="Reports" subtitle={report.periodLabel} className="space-y-6">
        <MonthlySalesReportCard
          defaultMonth={currentMonth}
          canExport={canExport}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Suspense fallback={<div className="h-11 bg-muted rounded-xl animate-pulse" />}>
            <ReportPeriodFilter />
          </Suspense>
          <ExportButtons period={period} />
        </div>

        <ReportSummaryCards
          summary={report.summary}
          currency={ctx.business.currency}
          revenueChange={period === "week" ? weeklyComparison.revenueChange : undefined}
          profitChange={period === "week" ? weeklyComparison.profitChange : undefined}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SalesTrendChart data={report.dailyTrend} />
          <MonthlyTrendChart data={monthlyTrend} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ExpenseBreakdownChart data={report.expenseBreakdown} />
          <TopProductsTable
            products={report.topProducts}
            currency={ctx.business.currency}
          />
        </div>

        <InventoryValuationCard
          items={report.inventoryValuation}
          totals={report.inventoryTotals}
          currency={ctx.business.currency}
        />
    </AppShell>
  );
}
