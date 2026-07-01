import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { getPurchaseOrder } from "@/lib/purchase-orders-queries";
import { PurchaseOrderDetailView } from "@/features/purchase-orders/purchase-order-detail-view";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("suppliers");
  const { id } = await params;

  const order = await getPurchaseOrder(ctx.businessId, id);
  if (!order) notFound();

  return (
    <PurchaseOrderDetailView order={order} currency={ctx.business.currency} />
  );
}
