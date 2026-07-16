"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useLocalData } from "@/components/providers/local-data-provider";
import { listLocalSales } from "@/lib/local-data/sales";
import { computeRushInsights } from "@/lib/rush-pos/insights";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, BarChart3 } from "lucide-react";

export function RushInsightsClient() {
  const { businessId, status } = useLocalData();
  const [insights, setInsights] = useState<ReturnType<typeof computeRushInsights> | null>(
    null
  );

  const load = useCallback(async () => {
    if (!businessId) return;
    const sales = await listLocalSales(businessId);
    setInsights(computeRushInsights(sales));
  }, [businessId]);

  useEffect(() => {
    if (status !== "ready" || !businessId) return;
    void load();
  }, [status, businessId, load]);

  const maxOrders = Math.max(1, ...(insights?.hourly.map((h) => h.orders) ?? [1]));

  return (
    <AppShell
      title="Rush insights"
      subtitle="Peak hours · popular food · combos"
      actions={
        <Link href="/sales" className="inline-flex items-center gap-1 text-sm font-medium text-brand">
          <ArrowLeft className="h-4 w-4" />
          Back to POS
        </Link>
      }
    >
      {!insights ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Today's orders", value: String(insights.todayOrders) },
              {
                label: "Today's revenue",
                value: formatCurrency(insights.todayRevenue),
              },
              {
                label: "Avg order value",
                value: formatCurrency(insights.avgOrderValue),
              },
              {
                label: "Peak hour",
                value:
                  insights.peakHourOrders > 0
                    ? `${insights.peakHourLabel} (${insights.peakHourOrders})`
                    : "—",
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Orders by hour · today</h2>
              <span className="text-xs text-muted-foreground">
                Current daypart: {insights.daypart}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
              {insights.hourly.map((h) => (
                <div key={h.hour} className="text-center">
                  <div className="mx-auto flex h-24 items-end rounded bg-muted/60 px-1">
                    <div
                      className={cn(
                        "w-full rounded-t",
                        h.orders === insights.peakHourOrders && insights.peakHourOrders > 0
                          ? "bg-emerald-500"
                          : "bg-foreground/70"
                      )}
                      style={{
                        height: `${Math.max((h.orders / maxOrders) * 100, h.orders > 0 ? 8 : 2)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {String(h.hour).padStart(2, "0")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="font-semibold">Most sold food</h2>
              <ul className="mt-3 space-y-2">
                {insights.topItems.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No sales yet today</li>
                ) : (
                  insights.topItems.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} · {formatCurrency(item.revenue)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="font-semibold">Popular pairings</h2>
              <ul className="mt-3 space-y-2">
                {insights.topCombosHint.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    Pairings appear after multi-item orders
                  </li>
                ) : (
                  insights.topCombosHint.map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground">{row.count}×</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
