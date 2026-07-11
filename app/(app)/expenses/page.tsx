import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { ExpensesPageClient } from "@/features/expenses/expenses-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requirePageAccess("expenses");

  return (
    <Suspense
      fallback={
        <AppShell title="Expenses" subtitle="Loading…" maxWidth="narrow">
          <Skeleton className="h-64 rounded-2xl" />
        </AppShell>
      }
    >
      <ExpensesPageClient />
    </Suspense>
  );
}
