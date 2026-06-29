import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
} from "lucide-react";
import { RevenueChart } from "@/features/dashboard/revenue-chart";

export default async function DashboardPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const [kpis, health, insights] = await Promise.all([
    getDashboardKPIs(ctx.businessId),
    calculateBusinessHealth(ctx.businessId),
    generateAIInsights(ctx.businessId),
  ]);

  // Persist health score (fire and forget)
  saveHealthScore(ctx.businessId, health).catch(() => {});

  const currency = ctx.business.currency;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Good ${getGreeting()}, ${ctx.business.name}`}
      />
      <main className="p-4 md:p-6 space-y-6 max-w-7xl">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            title="Sales Today"
            value={kpis.revenueToday}
            currency={currency}
            icon={TrendingUp}
            variant="success"
            delay={0}
          />
          <KPICard
            title="Profit Today"
            value={kpis.profitToday}
            currency={currency}
            icon={DollarSign}
            variant="default"
            delay={0.1}
          />
          <KPICard
            title="Expenses Today"
            value={kpis.expensesToday}
            currency={currency}
            icon={TrendingDown}
            variant="warning"
            delay={0.2}
          />
          <KPICard
            title="Outstanding Debt"
            value={kpis.totalDebt}
            currency={currency}
            icon={Users}
            variant={kpis.totalDebt > 0 ? "danger" : "default"}
            delay={0.3}
          />
        </div>

        {/* Alert pills */}
        <div className="flex flex-wrap gap-2">
          {kpis.lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Package className="h-3.5 w-3.5" />
              {kpis.lowStockCount} low stock
            </span>
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

        {/* Health Score + Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BusinessHealthScore health={health} />
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
