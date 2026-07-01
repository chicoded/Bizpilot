import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { getInventoryProduct } from "@/lib/products";
import { listSuppliersForBusiness } from "@/lib/suppliers";
import { ProductEditForm } from "@/features/inventory/product-edit-form";
import { format } from "date-fns";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("inventory");

  const { id } = await params;

  const [product, suppliers] = await Promise.all([
    getInventoryProduct(ctx.businessId, id),
    listSuppliersForBusiness(ctx.businessId),
  ]);

  if (!product) notFound();

  return (
    <ProductEditForm
      suppliers={suppliers}
      product={{
        id: product.id,
        name: product.name,
        category: product.category,
        barcode: product.barcode,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        unitsPerPack: product.unitsPerPack,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        expiryDate: product.expiryDate
          ? format(product.expiryDate, "yyyy-MM-dd")
          : null,
        imageUrl: product.imageUrl,
        supplierId: product.supplierId,
      }}
    />
  );
}
