import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { SalesHistoryPageClient } from "@/features/sales/sales-history-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function SalesHistoryPage() {
  await requirePageAccess("sales_history");

  return (
    <Suspense
      fallback={
        <AppShell title="Sales History" subtitle="Loading…" maxWidth="narrow">
          <Skeleton className="h-64 rounded-2xl" />
        </AppShell>
      }
    >
      <SalesHistoryPageClient />
    </Suspense>
  );
}
