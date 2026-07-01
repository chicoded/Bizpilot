"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  receivePurchaseOrder,
  updatePurchaseOrderStatus,
  markPurchaseOrderReceivedWithoutStock,
} from "@/actions/purchase-orders";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrderStatusBadge } from "@/features/purchase-orders/purchase-order-status-badge";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrderDetail } from "@/lib/purchase-orders-queries";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  Loader2,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";

export function PurchaseOrderDetailView({
  order,
  currency,
}: {
  order: PurchaseOrderDetail;
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.productId,
        String(item.quantityOrdered),
      ])
    )
  );

  const isOpen = ["requested", "ordered", "pending"].includes(order.status);
  const canReceiveStock = order.items.length > 0 && isOpen;

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Purchase order updated.");
      router.refresh();
    });
  }

  function handleReceive(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    runAction(() =>
      receivePurchaseOrder({
        orderId: order.id,
        lines: order.items.map((item) => ({
          productId: item.productId,
          quantityReceived: Number(receivedQty[item.productId] ?? 0),
        })),
      })
    );
  }

  return (
    <>
      <Header title="Purchase order" subtitle={order.supplier.name} />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 mobile-page">
        <Link
          href="/suppliers/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to purchase orders
        </Link>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <Link
                  href={`/suppliers/${order.supplier.id}`}
                  className="font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Truck className="h-4 w-4" />
                  {order.supplier.name}
                </Link>
                {order.supplier.contact && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.supplier.contact}
                  </p>
                )}
              </div>
              <PurchaseOrderStatusBadge status={order.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(order.createdAt, "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium text-biz-emerald">
                  {formatCurrency(order.total, currency)}
                </p>
              </div>
            </div>

            {isOpen && (
              <div className="flex flex-wrap gap-2 pt-1">
                {order.status === "requested" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        updatePurchaseOrderStatus({
                          orderId: order.id,
                          status: "ordered",
                        })
                      )
                    }
                  >
                    Mark as ordered
                  </Button>
                )}
                {!canReceiveStock && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        markPurchaseOrderReceivedWithoutStock(order.id)
                      )
                    }
                  >
                    <Check className="h-4 w-4" />
                    Mark received
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm("Cancel this purchase order?")) return;
                    runAction(() =>
                      updatePurchaseOrderStatus({
                        orderId: order.id,
                        status: "cancelled",
                      })
                    );
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {order.items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Line items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordered {item.quantityOrdered} · Received{" "}
                      {item.quantityReceived} ·{" "}
                      {formatCurrency(item.unitPrice, currency)} each
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    {formatCurrency(
                      item.unitPrice * item.quantityReceived,
                      currency
                    )}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {canReceiveStock && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                Receive stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReceive} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter quantities received. Inventory will be updated
                  automatically.
                </p>
                <div className="space-y-2 rounded-lg border divide-y">
                  {order.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ordered {item.quantityOrdered}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="w-24 h-10"
                        value={receivedQty[item.productId] ?? ""}
                        onChange={(e) =>
                          setReceivedQty((prev) => ({
                            ...prev,
                            [item.productId]: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-sm text-emerald-700 rounded-lg bg-emerald-50 px-3 py-2">
                    {success}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4" />
                      Receive & update inventory
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {order.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Request message</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                {order.notes}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
