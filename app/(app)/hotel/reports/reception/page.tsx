import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelReceptionClient } from "@/features/hotel/departments/hotel-reception-client";

export const dynamic = "force-dynamic";

export default async function ReceptionReportPage() {
  await requirePageAccess("hotel_reports");
  return (
    <Suspense
      fallback={
        <AppShell title="Reception Report" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelReceptionClient />
    </Suspense>
  );
}
