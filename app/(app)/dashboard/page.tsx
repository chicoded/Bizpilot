import { requirePageAccess } from "@/lib/auth";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { BusinessHealthScore } from "@/components/dashboard/business-health-score";
import { AIInsightsWidget } from "@/components/dashboard/ai-insights-widget";
import {
  getDashboardKPIs,
  calculateBusinessHealth,
  generateAIInsights,
  saveHealthScore,
} from "@/services/dashboard";
import { Package, AlertTriangle, Users } from "lucide-react";
import { RevenueChart } from "@/features/dashboard/revenue-chart";
import { LowStockAlertsCard } from "@/features/dashboard/low-stock-alerts-card";
import type { DashboardKPIs, AIInsight, BusinessHealthResult } from "@/types";

const emptyKPIs: DashboardKPIs = {
  revenueToday: 0,
  expensesToday: 0,
  profitToday: 0,
  lowStockCount: 0,
  expiringCount: 0,
  debtorsCount: 0,
  totalDebt: 0,
};

const emptyHealth: BusinessHealthResult = {
  score: 0,
  strengths: [],
  warnings: ["Could not load health data"],
  recommendations: ["Refresh the page or check your database connection"],
  breakdown: {
    sales: 0,
    profit: 0,
    inventory: 0,
    cashflow: 0,
    customers: 0,
  },
};

export default async function DashboardPage() {
  const ctx = await requirePageAccess("dashboard");

  let kpis = emptyKPIs;
  let health = emptyHealth;
  let insights: AIInsight[] = [];
  let loadError: string | null = null;

  try {
    [kpis, health, insights] = await Promise.all([
      getDashboardKPIs(ctx.businessId),
      calculateBusinessHealth(ctx.businessId),
      generateAIInsights(ctx.businessId),
    ]);
    saveHealthScore(ctx.businessId, health);
  } catch (error) {
    console.error("Dashboard load failed:", error);
    loadError =
      "Some dashboard data could not be loaded. Try refreshing the page.";
  }

  const currency = ctx.business.currency;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Good ${getGreeting()}, ${ctx.business.name}`}
      />
      <main className="p-4 md:p-6 space-y-6 max-w-7xl mobile-page">
        {loadError && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            {loadError}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            title="Sales Today"
            value={kpis.revenueToday}
            currency={currency}
            iconName="trendingUp"
            variant="success"
            delay={0}
          />
          <KPICard
            title="Profit Today"
            value={kpis.profitToday}
            currency={currency}
            iconName="dollarSign"
            variant="default"
            delay={0.1}
          />
          <KPICard
            title="Expenses Today"
            value={kpis.expensesToday}
            currency={currency}
            iconName="trendingDown"
            variant="warning"
            delay={0.2}
          />
          <KPICard
            title="Outstanding Debt"
            value={kpis.totalDebt}
            currency={currency}
            iconName="users"
            variant={kpis.totalDebt > 0 ? "danger" : "default"}
            delay={0.3}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {kpis.lowStockCount > 0 && (
            <Link
              href="/inventory/low-stock"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <Package className="h-3.5 w-3.5" />
              {kpis.lowStockCount} low stock
            </Link>
          )}
          {kpis.expiringCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {kpis.expiringCount} expiring soon
            </span>
          )}
          {kpis.debtorsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700">
              <Users className="h-3.5 w-3.5" />
              {kpis.debtorsCount} debtors
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <BusinessHealthScore health={health} />
            <LowStockAlertsCard businessId={ctx.businessId} />
          </div>
          <div className="space-y-6">
            <AIInsightsWidget insights={insights} />
            <RevenueChart businessId={ctx.businessId} />
          </div>
        </div>
      </main>
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
