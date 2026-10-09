import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelManagementClient } from "@/features/hotel/hotel-management-client";

export const dynamic = "force-dynamic";

export default async function HotelManagementPage() {
  await requirePageAccess("hotel_management");
  return (
    <Suspense
      fallback={
        <AppShell title="Hotel Management" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelManagementClient />
    </Suspense>
  );
}
