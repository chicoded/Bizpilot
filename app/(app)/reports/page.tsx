import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import {
  getFullReport,
  getWeeklyComparison,
  getMonthlyTrend,
} from "@/services/reports";
import { ReportPeriodFilter } from "@/features/reports/report-period-filter";
import { ExportButtons } from "@/features/reports/export-buttons";
import { ReportSummaryCards } from "@/features/reports/report-summary-cards";
import { SalesTrendChart } from "@/features/reports/sales-trend-chart";
import { MonthlyTrendChart } from "@/features/reports/monthly-trend-chart";
import { ExpenseBreakdownChart } from "@/features/reports/expense-breakdown-chart";
import { TopProductsTable } from "@/features/reports/top-products-table";
import { InventoryValuationCard } from "@/features/reports/inventory-valuation-card";
import type { ReportPeriod } from "@/types";

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const params = await searchParams;
  const period = (params.period as ReportPeriod) || "month";

  const [report, weeklyComparison, monthlyTrend] = await Promise.all([
    getFullReport(ctx.businessId, period),
    getWeeklyComparison(ctx.businessId),
    getMonthlyTrend(ctx.businessId),
  ]);

  return (
    <>
      <Header
        title="Reports"
        subtitle={report.periodLabel}
      />
      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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
      </main>
    </>
  );
}
