"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusChip } from "@/components/ui/status-chip";
import { KPICard } from "@/components/dashboard/kpi-card";
import { BusinessHealthScore } from "@/components/dashboard/business-health-score";
import { AIInsightsWidget } from "@/components/dashboard/ai-insights-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  getLocalBusinessHealth,
  getLocalDashboardKPIs,
} from "@/lib/local-data/dashboard";
import { Package, AlertTriangle, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { LowStockAlertsCard } from "@/features/dashboard/low-stock-alerts-card";
import type { DashboardKPIs, BusinessHealthResult } from "@/types";

const RevenueChart = dynamic(
  () =>
    import("@/features/dashboard/revenue-chart").then((mod) => mod.RevenueChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] rounded-2xl" />,
  }
);

const emptyKPIs: DashboardKPIs = {
  revenueToday: 0,
  expensesToday: 0,
  profitToday: 0,
  lowStockCount: 0,
  expiringCount: 0,
  debtorsCount: 0,
  totalDebt: 0,
};

export function DashboardPageClient() {
  const { businessId, businessName, currency, status } = useLocalData();
  const [kpis, setKpis] = useState<DashboardKPIs>(emptyKPIs);
  const [health, setHealth] = useState<BusinessHealthResult | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setKpis(emptyKPIs);
      setHealth(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [kpiData, healthData] = await Promise.all([
        getLocalDashboardKPIs(businessId),
        getLocalBusinessHealth(businessId),
      ]);
      setKpis(kpiData);
      setHealth(healthData);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading") {
    return (
      <AppShell title="Dashboard" subtitle="Loading…">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Good ${getGreeting()}, ${businessName}`}
    >
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
            {health && <BusinessHealthScore health={health} />}
            {businessId && <LowStockAlertsCard businessId={businessId} />}
          </div>
          <div className="space-y-6">
            <AIInsightsWidget insights={[]} />
            {businessId && <RevenueChart businessId={businessId} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
