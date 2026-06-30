import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { getSaleReceipt } from "@/lib/sales";
import { Header } from "@/components/layout/header";
import { SaleReceiptView } from "@/features/sales/sale-receipt-view";

export default async function SaleReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("sales");

  const { id } = await params;
  const sale = await getSaleReceipt(ctx.businessId, id);

  if (!sale) notFound();

  return (
    <>
      <Header title="Receipt" subtitle={ctx.business.name} />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <SaleReceiptView
          sale={sale}
          businessName={ctx.business.name}
          currency={ctx.business.currency}
        />
      </main>
    </>
  );
}
