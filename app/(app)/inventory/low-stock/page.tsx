import { requirePageAccess } from "@/lib/auth";
import { LowStockPageClient } from "@/features/inventory/low-stock-page-client";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  await requirePageAccess("inventory");
  return <LowStockPageClient />;
}
