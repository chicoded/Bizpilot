import { requirePageAccess } from "@/lib/auth";
import { DebtsPageClient } from "@/features/debts/debts-page-client";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  await requirePageAccess("debts");
  return <DebtsPageClient />;
}
