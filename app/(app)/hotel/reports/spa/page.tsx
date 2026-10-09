import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelSpaClient } from "@/features/hotel/departments/hotel-spa-client";

export const dynamic = "force-dynamic";

export default async function SpaReportPage() {
  await requirePageAccess("hotel_reports");
  return (
    <Suspense
      fallback={
        <AppShell title="Spa Report" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelSpaClient />
    </Suspense>
  );
}
