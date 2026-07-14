"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  listLocalExpensesSummary,
  type LocalExpensePeriod,
} from "@/lib/local-data/expenses";
import { ExpensesPanel } from "@/features/expenses/expenses-panel";

function parsePeriod(value: string | null): LocalExpensePeriod {
  if (value === "week" || value === "month" || value === "all") return value;
  return "month";
}

export function ExpensesPageClient() {
  const { businessId, currency, status } = useLocalData();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const [data, setData] = useState({ expenses: [] as Awaited<ReturnType<typeof listLocalExpensesSummary>>["expenses"], total: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!businessId) {
      setData({ expenses: [], total: 0 });
      setLoading(false);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      setData(await listLocalExpensesSummary(businessId, period));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [businessId, period]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading") {
    return (
      <AppShell title="Expenses" subtitle="Loading…" maxWidth="narrow">
        <Skeleton className="h-64 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Expenses" subtitle="Track where your money goes" maxWidth="narrow">
      <ExpensesPanel
        expenses={data.expenses}
        total={data.total}
        currency={currency}
        period={period}
        onChanged={() => void reload({ silent: true })}
      />
    </AppShell>
  );
}
