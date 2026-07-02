"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { TopProduct } from "@/types";

interface TopProductsTableProps {
  products: TopProduct[];
  currency?: string;
}

export function TopProductsTable({
  products,
  currency = "NGN",
}: TopProductsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No sales in this period
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((product, i) => (
              <div
                key={product.name}
                className="flex items-center gap-3 rounded-xl surface-muted p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-biz-blue text-white text-xs font-bold dark:bg-primary dark:text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.quantitySold} sold
                  </p>
                </div>
                <p className="font-bold text-sm text-biz-emerald shrink-0">
                  {formatCurrency(product.revenue, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
