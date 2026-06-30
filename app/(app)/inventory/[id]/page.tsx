import { notFound, redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const product = await prisma.product.findFirst({
    where: { id, businessId: ctx.businessId, isActive: true },
  });

  if (!product) notFound();

  return (
    <ProductEditForm
      product={{
        id: product.id,
        name: product.name,
        category: product.category,
        barcode: product.barcode,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        expiryDate: product.expiryDate
          ? format(product.expiryDate, "yyyy-MM-dd")
          : null,
      }}
    />
  );
}
