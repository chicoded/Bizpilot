"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import { getLocalSaleReceipt } from "@/lib/local-data/sales";
import { SaleReceiptView } from "@/features/sales/sale-receipt-view";

export function SaleReceiptPageClient({
  saleId,
  autoPrint,
}: {
  saleId: string;
  autoPrint?: boolean;
}) {
  const { businessId, businessName, currency, status } = useLocalData();
  const [sale, setSale] = useState<Awaited<ReturnType<typeof getLocalSaleReceipt>>>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(async () => {
    if (!businessId) {
      setSale(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const receipt = await getLocalSaleReceipt(businessId, saleId);
      if (!receipt) {
        setMissing(true);
      } else {
        setSale(receipt);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId, saleId]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (missing) notFound();

  if (loading || status === "loading" || !sale) {
    return (
      <>
        <Header title="Receipt" subtitle="Loading…" />
        <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
          <Skeleton className="h-96 rounded-2xl" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Receipt" subtitle={sale.receiptNumber} />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <SaleReceiptView
          sale={sale}
          autoPrint={autoPrint}
          business={{
            name: businessName,
            phone: null,
            address: null,
            currency,
          }}
        />
      </main>
    </>
  );
}
