import { requirePageAccess } from "@/lib/auth";
import { CustomerForm } from "@/features/customers/customer-form";

export default async function NewCustomerPage() {
  await requirePageAccess("customers");
  return <CustomerForm mode="create" />;
}
