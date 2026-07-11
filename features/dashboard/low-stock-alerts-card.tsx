"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listLocalLowStockProducts } from "@/lib/local-data/low-stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";

export function LowStockAlertsCard({
  businessId,
}: {
  businessId: string;
}) {
  const [products, setProducts] = useState<
    Awaited<ReturnType<typeof listLocalLowStockProducts>>
  >([]);

  useEffect(() => {
    void listLocalLowStockProducts(businessId).then(setProducts);
  }, [businessId]);

  if (products.length === 0) return null;

  const preview = products.slice(0, 4);

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Low stock alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"} at or below
          reorder level.
        </p>
        <ul className="space-y-1.5">
          {preview.map((product) => (
            <li
              key={product.id}
              className="text-sm flex items-center justify-between gap-2"
            >
              <span className="truncate">{product.name}</span>
              <span className="text-xs text-amber-700 shrink-0">
                {product.quantity}/{product.reorderLevel}
              </span>
            </li>
          ))}
        </ul>
        {products.length > preview.length && (
          <p className="text-xs text-muted-foreground">
            +{products.length - preview.length} more
          </p>
        )}
        <Button asChild size="sm" className="w-full">
          <Link href="/inventory/low-stock">
            Review & restock
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
