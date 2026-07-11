"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  listLocalSalesSummary,
  type LocalSalePeriod,
} from "@/lib/local-data/sales";
import { SalesHistoryPanel } from "@/features/sales/sales-history-panel";
import { ShoppingCart } from "lucide-react";

function parsePeriod(value: string | null): LocalSalePeriod {
  if (
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "all"
  ) {
    return value;
  }
  return "month";
}

export function SalesHistoryPageClient() {
  const { businessId, currency, status } = useLocalData();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const [data, setData] = useState({
    sales: [] as Awaited<ReturnType<typeof listLocalSalesSummary>>["sales"],
    totalRevenue: 0,
    totalProfit: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setData({ sales: [], totalRevenue: 0, totalProfit: 0, count: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await listLocalSalesSummary(businessId, period));
    } finally {
      setLoading(false);
    }
  }, [businessId, period]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading") {
    return (
      <AppShell title="Sales History" subtitle="Loading…" maxWidth="narrow">
        <Skeleton className="h-64 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Sales History"
      subtitle={`${data.count} transactions`}
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
        sales={data.sales}
        totalRevenue={data.totalRevenue}
        totalProfit={data.totalProfit}
        count={data.count}
        currency={currency}
        period={period}
      />
    </AppShell>
  );
}
