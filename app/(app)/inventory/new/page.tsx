import { NewProductForm } from "@/features/inventory/new-product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const { barcode } = await searchParams;
  return <NewProductForm initialBarcode={barcode ?? ""} />;
}
