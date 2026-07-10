import { requirePageAccess } from "@/lib/auth";
import { InventoryPageClient } from "@/features/inventory/inventory-page-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requirePageAccess("inventory");
  return <InventoryPageClient />;
}
