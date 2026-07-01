import { requirePageAccess } from "@/lib/auth";
import { SupplierForm } from "@/features/suppliers/supplier-form";

export default async function NewSupplierPage() {
  await requirePageAccess("suppliers");
  return <SupplierForm mode="create" />;
}
