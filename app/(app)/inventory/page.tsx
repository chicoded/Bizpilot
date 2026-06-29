import { redirect } from "next/navigation";
import Link from "next/link";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { addDays } from "date-fns";

export default async function InventoryPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const products = await prisma.product.findMany({
    where: { businessId: ctx.businessId, isActive: true },
    orderBy: { name: "asc" },
  });

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;
  const expiringCount = products.filter(
    (p) =>
      p.expiryDate &&
      p.expiryDate <= addDays(new Date(), 30) &&
      p.expiryDate >= new Date()
  ).length;

  return (
    <>
      <Header title="Inventory" subtitle={`${products.length} products`} />
      <main className="p-4 md:p-6 space-y-4 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {lowStockCount > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                {lowStockCount} need restocking
              </span>
            )}
            {expiringCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                {expiringCount} expiring soon
              </span>
            )}
          </div>
          <Link href="/inventory/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No products yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                Add your first product to start tracking inventory and making sales.
              </p>
              <Link href="/inventory/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Add First Product
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const isLowStock = product.quantity <= product.reorderLevel;
              const isExpiring =
                product.expiryDate &&
                product.expiryDate <= addDays(new Date(), 30);

              return (
                <Link key={product.id} href={`/inventory/${product.id}`}>
                  <Card className="hover:shadow-glass transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold truncate flex-1">
                          {product.name}
                        </h3>
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                      {product.category && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {product.category}
                        </p>
                      )}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-lg font-bold text-biz-blue">
                            {formatCurrency(
                              Number(product.sellingPrice),
                              ctx.business.currency
                            )}
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              isLowStock ? "text-amber-600" : "text-muted-foreground"
                            }`}
                          >
                            {product.quantity} in stock
                          </p>
                        </div>
                        {product.expiryDate && (
                          <p
                            className={`text-xs ${
                              isExpiring ? "text-red-500 font-medium" : "text-muted-foreground"
                            }`}
                          >
                            Exp: {formatDate(product.expiryDate)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
