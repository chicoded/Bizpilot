import { requirePageAccess } from "@/lib/auth";
import { NewProductForm } from "@/features/inventory/new-product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  await requirePageAccess("inventory");
  const { barcode } = await searchParams;
  return <NewProductForm initialBarcode={barcode ?? ""} />;
}
