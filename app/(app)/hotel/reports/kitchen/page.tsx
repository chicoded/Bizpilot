import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelKitchenClient } from "@/features/hotel/departments/hotel-kitchen-client";

export const dynamic = "force-dynamic";

export default async function KitchenReportPage() {
  await requirePageAccess("hotel_reports");
  return (
    <Suspense
      fallback={
        <AppShell title="Kitchen Report" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelKitchenClient />
    </Suspense>
  );
}
