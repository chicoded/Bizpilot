import { requirePageAccess } from "@/lib/auth";
import { SaleReceiptPageClient } from "@/features/sales/sale-receipt-page-client";

export const dynamic = "force-dynamic";

export default async function SaleReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  await requirePageAccess("sales");

  const { id } = await params;
  const { print } = await searchParams;

  return <SaleReceiptPageClient saleId={id} autoPrint={print === "1"} />;
}
