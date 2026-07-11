import { requirePageAccess } from "@/lib/auth";
import { CustomersPageClient } from "@/features/customers/customers-page-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requirePageAccess("customers");
  return <CustomersPageClient />;
}
