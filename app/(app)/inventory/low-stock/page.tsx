import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import {
  groupLowStockBySupplier,
  listLowStockProducts,
} from "@/lib/low-stock";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickSupplierReorderButton } from "@/features/inventory/quick-supplier-reorder-button";
import { ArrowLeft, AlertTriangle, Package, Truck } from "lucide-react";

export default async function LowStockPage() {
  const ctx = await requirePageAccess("inventory");
  const products = await listLowStockProducts(ctx.businessId);
  const { unassigned, supplierGroups } = groupLowStockBySupplier(products);

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
          <>
            {supplierGroups.map((group) => (
              <Card key={group.supplierId} className="border-amber-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <Truck className="h-4 w-4 shrink-0" />
                      <Link
                        href={`/suppliers/${group.supplierId}`}
                        className="truncate hover:underline"
                      >
                        {group.supplierName}
                      </Link>
                    </span>
                    <span className="text-xs font-normal text-amber-700 shrink-0">
                      {group.products.length} low
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {group.products.map((product) => (
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
                            {product.quantity} left · reorder at{" "}
                            {product.reorderLevel} · suggest{" "}
                            {product.suggestedOrderQty}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {group.hasPhone ? (
                    <QuickSupplierReorderButton
                      supplierId={group.supplierId}
                      supplierName={group.supplierName}
                      items={group.products.map((product) => ({
                        productId: product.id,
                        quantity: product.suggestedOrderQty,
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      Add a phone number on the supplier profile to send a
                      WhatsApp reorder.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {unassigned.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    No supplier assigned
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {unassigned.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} left · reorder at {product.reorderLevel}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/inventory/${product.id}`}>Assign</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
