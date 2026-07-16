import { requirePageAccess } from "@/lib/auth";
import { listSuppliersForBusiness } from "@/lib/suppliers";
import { NewProductForm } from "@/features/inventory/new-product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const ctx = await requirePageAccess("inventory");
  const { barcode } = await searchParams;
  const suppliers = await listSuppliersForBusiness(ctx.businessId);
  return (
    <NewProductForm
      initialBarcode={barcode ?? ""}
      suppliers={suppliers}
      industry={ctx.business.industry}
    />
  );
}
