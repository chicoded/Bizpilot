import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelReportsPageClient } from "@/features/hotel/hotel-reports-page-client";

export const dynamic = "force-dynamic";

export default async function HotelReportsPage() {
  await requirePageAccess("hotel_reports");

  return (
    <Suspense
      fallback={
        <AppShell title="Hotel Reports" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelReportsPageClient />
    </Suspense>
  );
}
