import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { ReportsPageClient } from "@/features/reports/reports-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePageAccess("reports");

  return (
    <Suspense
      fallback={
        <AppShell title="Reports" subtitle="Loading…">
          <Skeleton className="h-64 rounded-2xl" />
        </AppShell>
      }
    >
      <ReportsPageClient />
    </Suspense>
  );
}
