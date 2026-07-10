import { requirePageAccess } from "@/lib/auth";
import { Role } from "@prisma/client";
import { listSuppliersForBusiness } from "@/lib/suppliers";
import { ProductEditPageClient } from "@/features/inventory/product-edit-page-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("inventory");
  const { id } = await params;
  const suppliers = await listSuppliersForBusiness(ctx.businessId);
  const canDelete =
    ctx.role === Role.OWNER || ctx.role === Role.MANAGER;

  return (
    <ProductEditPageClient
      productId={id}
      suppliers={suppliers}
      canDelete={canDelete}
    />
  );
}
