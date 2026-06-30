import { notFound, redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { getInventoryProduct } from "@/lib/products";
import { ProductEditForm } from "@/features/inventory/product-edit-form";
import { format } from "date-fns";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const { id } = await params;

  const product = await getInventoryProduct(ctx.businessId, id);

  if (!product) notFound();

  return (
    <ProductEditForm
      product={{
        id: product.id,
        name: product.name,
        category: product.category,
        barcode: product.barcode,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        expiryDate: product.expiryDate
          ? format(product.expiryDate, "yyyy-MM-dd")
          : null,
        imageUrl: product.imageUrl,
      }}
    />
  );
}
