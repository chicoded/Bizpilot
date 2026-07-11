import { requirePageAccess } from "@/lib/auth";
import { DashboardPageClient } from "@/features/dashboard/dashboard-page-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageAccess("dashboard");
  return <DashboardPageClient />;
}
