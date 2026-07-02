"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SaleReceipt } from "@/lib/sales";
import {
  formatReceiptText,
  whatsAppShareUrl,
  type ReceiptBusinessInfo,
} from "@/lib/receipt";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import { ArrowLeft, Copy, MessageCircle, Printer, Share2 } from "lucide-react";

const paymentLabel = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

interface SaleReceiptViewProps {
  sale: SaleReceipt;
  business: ReceiptBusinessInfo;
  compact?: boolean;
  autoPrint?: boolean;
}

export function SaleReceiptView({
  sale,
  business,
  compact = false,
  autoPrint = false,
}: SaleReceiptViewProps) {
  const [copied, setCopied] = useState(false);
  const receiptText = formatReceiptText(business, sale);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  async function handleCopy() {
    await navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${business.name} — Receipt`,
          text: receiptText,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    await handleCopy();
  }

  const sharePhone = sale.customer?.phone ?? business.phone;
  const whatsAppUrl = whatsAppShareUrl(receiptText, sharePhone);

  return (
    <div className="space-y-4 receipt-page">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/sales/history"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Sales history
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
            >
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
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
        </div>
      )}

      <Card className="thermal-receipt print:shadow-none print:border-none mx-auto max-w-lg print:max-w-none">
        <CardContent className="p-6 print:p-0 space-y-4" id="sale-receipt">
          <div className="text-center border-b border-dashed pb-4 print:pb-3">
            <p className="text-lg font-bold text-brand print:text-black">
              {business.name}
            </p>
            {business.phone && (
              <p className="text-xs text-muted-foreground mt-1 print:text-black">
                {business.phone}
              </p>
            )}
            {business.address && (
              <p className="text-xs text-muted-foreground print:text-black">
                {business.address}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2 print:text-black">
              Sales Receipt
            </p>
            <p className="text-xs text-muted-foreground mt-1 print:text-black">
              {formatDate(sale.createdAt)} · #{sale.id.slice(-8).toUpperCase()}
            </p>
          </div>

          {sale.customer && (
            <div className="text-sm">
              <p className="font-medium">{sale.customer.name}</p>
              {sale.customer.phone && (
                <p className="text-muted-foreground print:text-black">
                  {sale.customer.phone}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{item.name}</p>
                  <p className="text-muted-foreground text-xs print:text-black">
                    {item.quantity} ×{" "}
                    {formatCurrency(item.sellingPrice, business.currency)}
                  </p>
                </div>
                <p className="font-medium shrink-0">
                  {formatCurrency(item.total, business.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-black">
                Subtotal
              </span>
              <span>{formatCurrency(sale.subtotal, business.currency)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-black">
                  Discount
                </span>
                <span>-{formatCurrency(sale.discount, business.currency)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-black">
                  Tax
                </span>
                <span>{formatCurrency(sale.tax, business.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1">
              <span>TOTAL</span>
              <span className="text-brand print:text-black">
                {formatCurrency(sale.total, business.currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground print:text-black">
              <span>Payment</span>
              <span>
                {paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}
                {sale.isCredit ? " (Credit)" : ""}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2 print:text-black">
            Thank you for your purchase!
          </p>
        </CardContent>
      </Card>

      {!compact && (
        <div className="flex gap-3 print:hidden">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/sales">New sale</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/sales/history">All sales</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
