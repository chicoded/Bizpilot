"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import { listLocalLowStockProducts } from "@/lib/local-data/low-stock";
import { ArrowLeft, AlertTriangle, Package } from "lucide-react";

export function LowStockPageClient() {
  const { businessId, status } = useLocalData();
  const [products, setProducts] = useState<
    Awaited<ReturnType<typeof listLocalLowStockProducts>>
  >([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setProducts(await listLocalLowStockProducts(businessId));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading") {
    return (
      <>
        <Header title="Low stock alerts" subtitle="Loading…" />
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title="Low stock alerts"
        subtitle={
          products.length === 0
            ? "All products are above reorder levels"
            : `${products.length} product${products.length === 1 ? "" : "s"} need attention`
        }
      />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 mobile-page">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground">You&apos;re fully stocked</p>
              <p className="text-sm mt-1">
                Products appear here when quantity falls to the reorder level.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200/60">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {products.length} low stock item{products.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/inventory/${product.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity} left · reorder at {product.reorderLevel} ·
                        suggest {product.suggestedOrderQty}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/inventory/${product.id}`}>Restock</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
