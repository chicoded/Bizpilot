import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelExpensesPageClient } from "@/features/hotel/hotel-expenses-page-client";

export const dynamic = "force-dynamic";

export default async function HotelExpensesPage() {
  await requirePageAccess("hotel_expenses");
  return (
    <Suspense
      fallback={
        <AppShell title="Hotel Expenses" subtitle="Loading…" maxWidth="wide">
          <Skeleton className="h-96 rounded-2xl" />
        </AppShell>
      }
    >
      <HotelExpensesPageClient />
    </Suspense>
  );
}
