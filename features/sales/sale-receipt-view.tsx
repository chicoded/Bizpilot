"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SaleReceipt } from "@/lib/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import { ArrowLeft, Printer } from "lucide-react";

const paymentLabel = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

interface SaleReceiptViewProps {
  sale: SaleReceipt;
  businessName: string;
  currency: string;
}

export function SaleReceiptView({
  sale,
  businessName,
  currency,
}: SaleReceiptViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/sales/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Sales history
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-6 space-y-5" id="sale-receipt">
          <div className="text-center border-b pb-4">
            <p className="text-lg font-bold text-biz-blue">{businessName}</p>
            <p className="text-sm text-muted-foreground mt-1">Sales Receipt</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(sale.createdAt)} · #{sale.id.slice(-8).toUpperCase()}
            </p>
          </div>

          {sale.customer && (
            <div className="text-sm">
              <p className="font-medium">{sale.customer.name}</p>
              {sale.customer.phone && (
                <p className="text-muted-foreground">{sale.customer.phone}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.sellingPrice, currency)}
                  </p>
                </div>
                <p className="font-medium shrink-0">
                  {formatCurrency(item.total, currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal, currency)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(sale.discount, currency)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(sale.tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Total</span>
              <span className="text-biz-blue">
                {formatCurrency(sale.total, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Payment</span>
              <span>
                {paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}
                {sale.isCredit ? " (Credit)" : ""}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2 print:block">
            Thank you for your purchase
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3 print:hidden">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/sales">New sale</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/sales/history">All sales</Link>
        </Button>
      </div>
    </div>
  );
}
