import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelStoreClient } from "@/features/hotel/departments/hotel-store-client";

export const dynamic = "force-dynamic";

export default async function StoreReportPage() {
  await requirePageAccess("hotel_reports");
  return (
    <Suspense
      fallback={
        <AppShell title="Store Report" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelStoreClient />
    </Suspense>
  );
}
