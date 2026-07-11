import { requirePageAccess } from "@/lib/auth";
import { CustomerForm } from "@/features/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("customers");
  const { id } = await params;
  return <CustomerForm mode="edit" customerId={id} />;
}
