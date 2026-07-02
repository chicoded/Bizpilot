"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { InventoryValuationItem } from "@/types";

interface InventoryValuationCardProps {
  items: InventoryValuationItem[];
  totals: { cost: number; retail: number; productCount: number };
  currency?: string;
}

export function InventoryValuationCard({
  items,
  totals,
  currency = "NGN",
}: InventoryValuationCardProps) {
  const potentialProfit = totals.retail - totals.cost;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Inventory Valuation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl surface-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="text-lg font-bold text-foreground">{totals.productCount}</p>
          </div>
          <div className="rounded-xl bg-biz-blue/5 dark:bg-primary/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Cost Value</p>
            <p className="text-sm font-bold text-brand">
              {formatCurrency(totals.cost, currency)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Retail Value</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.retail, currency)}
            </p>
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Potential profit if all stock sold:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(potentialProfit, currency)}
          </span>
        </p>

        {items.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {items.slice(0, 10).map((item) => (
              <div
                key={item.name}
                className="flex justify-between text-xs py-1.5 border-b border-border/50 last:border-0"
              >
                <span className="truncate flex-1">{item.name}</span>
                <span className="text-muted-foreground mx-2">{item.quantity} pcs</span>
                <span className="font-medium shrink-0">
                  {formatCurrency(item.retailValue, currency)}
                </span>
              </div>
            ))}
            {items.length > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{items.length - 10} more products
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
