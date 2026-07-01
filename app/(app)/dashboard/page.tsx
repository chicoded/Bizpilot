import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { StatusChip } from "@/components/ui/status-chip";
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
      <AppShell
        title="Dashboard"
        subtitle={`Good ${getGreeting()}, ${ctx.business.name}`}
      >
        {loadError && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-warning-foreground bg-warning/15 border border-warning/30 rounded-xl px-4 py-3 mb-6"
          >
            {loadError}
          </p>
        )}

        <div className="space-y-6">
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
            <StatusChip
              icon={Package}
              label={`${kpis.lowStockCount} low stock`}
              href="/inventory/low-stock"
              variant="warning"
            />
          )}
          {kpis.expiringCount > 0 && (
            <StatusChip
              icon={AlertTriangle}
              label={`${kpis.expiringCount} expiring soon`}
              href="/inventory"
              variant="danger"
            />
          )}
          {kpis.debtorsCount > 0 && (
            <StatusChip
              icon={Users}
              label={`${kpis.debtorsCount} debtors`}
              href="/debts"
              variant="warning"
            />
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
        </div>
      </AppShell>
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
