import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelBarClient } from "@/features/hotel/departments/hotel-bar-client";

export const dynamic = "force-dynamic";

export default async function BarReportPage() {
  await requirePageAccess("hotel_reports");
  return (
    <Suspense
      fallback={
        <AppShell title="Bar Report" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelBarClient />
    </Suspense>
  );
}
