import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/purchase-orders-queries";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseOrderStatusBadge } from "@/features/purchase-orders/purchase-order-status-badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, ClipboardList } from "lucide-react";

export default async function PurchaseOrdersPage() {
  const ctx = await requirePageAccess("suppliers");
  const orders = await listPurchaseOrders(ctx.businessId);

  const openCount = orders.filter((order) =>
    ["requested", "ordered", "pending"].includes(order.status)
  ).length;

  return (
    <>
      <Header
        title="Purchase orders"
        subtitle={
          openCount > 0
            ? `${openCount} open · ${orders.length} total`
            : `${orders.length} orders`
        }
      />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 mobile-page">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to suppliers
        </Link>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No purchase orders yet.</p>
              <p className="text-sm mt-2">
                Send a supply request from a supplier page to create one.
              </p>
              <Button asChild className="mt-4">
                <Link href="/suppliers">View suppliers</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Link key={order.id} href={`/suppliers/orders/${order.id}`}>
              <Card className="hover:shadow-glass transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{order.supplier.name}</p>
                      <PurchaseOrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(order.createdAt, "MMM d, yyyy")}
                      {order.hasItems &&
                        ` · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-biz-emerald">
                      {formatCurrency(order.total, ctx.business.currency)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </main>
    </>
  );
}
