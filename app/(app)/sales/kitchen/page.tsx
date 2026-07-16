"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  listLocalKitchenOrders,
  updateLocalKitchenOrderStatus,
} from "@/lib/local-data/kitchen-orders";
import { updateKitchenOrderStatus } from "@/actions/rush-pos";
import type { LocalKitchenOrder } from "@/lib/local-db/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChefHat } from "lucide-react";

const STATUSES: LocalKitchenOrder["status"][] = [
  "PENDING",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export default function KitchenDisplayPage() {
  const { businessId, status } = useLocalData();
  const [orders, setOrders] = useState<LocalKitchenOrder[]>([]);
  const [pending, start] = useTransition();

  const reload = useCallback(async () => {
    if (!businessId) return;
    const rows = await listLocalKitchenOrders(businessId, { activeOnly: true });
    setOrders(rows);
  }, [businessId]);

  useEffect(() => {
    if (status !== "ready" || !businessId) return;
    void reload();
    const timer = setInterval(() => void reload(), 8000);
    return () => clearInterval(timer);
  }, [status, businessId, reload]);

  function setStatus(order: LocalKitchenOrder, next: LocalKitchenOrder["status"]) {
    if (!businessId) return;
    start(async () => {
      await updateLocalKitchenOrderStatus(businessId, order.id, next);
      void updateKitchenOrderStatus(order.id, next);
      await reload();
    });
  }

  return (
    <AppShell
      title="Kitchen Display"
      subtitle="Rush tickets"
      actions={
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to POS
        </Link>
      }
    >
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <ChefHat className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No active kitchen tickets</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New Rush POS orders appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.serviceType.replace("_", " ")} ·{" "}
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                    order.status === "PENDING" && "bg-amber-100 text-amber-800",
                    order.status === "PREPARING" && "bg-sky-100 text-sky-800",
                    order.status === "READY" && "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {order.status}
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {order.items.map((item, idx) => (
                  <li key={`${order.id}-${idx}`} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}× {item.productName}
                    </span>
                  </li>
                ))}
              </ul>
              {order.notes ? (
                <p className="rounded-lg bg-muted px-2 py-1 text-xs">{order.notes}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== order.status).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setStatus(order, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
