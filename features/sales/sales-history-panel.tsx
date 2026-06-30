"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { SaleListItem, SalePeriod } from "@/lib/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import { ChevronRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: SalePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const paymentLabel = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

interface SalesHistoryPanelProps {
  sales: SaleListItem[];
  totalRevenue: number;
  totalProfit: number;
  count: number;
  currency: string;
  period: SalePeriod;
}

export function SalesHistoryPanel({
  sales,
  totalRevenue,
  totalProfit,
  count,
  currency,
  period,
}: SalesHistoryPanelProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => router.push(`/sales/history?period=${option.value}`)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              period === option.value
                ? "bg-biz-blue text-white"
                : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-biz-emerald/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-biz-emerald">
              {formatCurrency(totalRevenue, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {count} sale{count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-biz-blue/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Profit</p>
            <p className="text-2xl font-bold text-biz-blue">
              {formatCurrency(totalProfit, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No sales recorded for this period.</p>
            <Link
              href="/sales"
              className="text-biz-blue text-sm font-medium mt-2 inline-block"
            >
              Go to Point of Sale
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => (
            <Link key={sale.id} href={`/sales/${sale.id}`}>
              <Card className="hover:shadow-glass transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatCurrency(sale.total, currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}
                      {sale.customerName ? ` · ${sale.customerName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(sale.createdAt)} · {sale.itemCount} item
                      {sale.itemCount === 1 ? "" : "s"}
                      {sale.isCredit && " · Credit"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
