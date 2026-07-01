import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { getSaleReceipt } from "@/lib/sales";
import { Header } from "@/components/layout/header";
import { SaleReceiptView } from "@/features/sales/sale-receipt-view";

export default async function SaleReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const ctx = await requirePageAccess("sales");

  const { id } = await params;
  const { print } = await searchParams;
  const sale = await getSaleReceipt(ctx.businessId, id);

  if (!sale) notFound();

  return (
    <>
      <Header title="Receipt" subtitle={ctx.business.name} />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <SaleReceiptView
          sale={sale}
          autoPrint={print === "1"}
          business={{
            name: ctx.business.name,
            phone: ctx.business.phone,
            address: ctx.business.address,
            currency: ctx.business.currency,
          }}
        />
      </main>
    </>
  );
}
