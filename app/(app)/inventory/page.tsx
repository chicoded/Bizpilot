import { redirect } from "next/navigation";
import Link from "next/link";
import { getBusinessContext } from "@/lib/auth";
import { listInventoryProducts } from "@/lib/products";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package } from "lucide-react";
import { addDays } from "date-fns";
import { ProductCard } from "@/features/inventory/product-card";
import { ScanToAddProductButton } from "@/features/inventory/scan-to-add-button";

export default async function InventoryPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const products = await listInventoryProducts(ctx.businessId);

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
      <main className="p-4 md:p-6 space-y-4 max-w-7xl mobile-page">
        {products.length > 0 && <ScanToAddProductButton />}
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
          <Button size="sm" asChild>
            <Link href="/inventory/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No products yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                Scan a barcode or add your first product manually to start selling.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <ScanToAddProductButton />
                <Button asChild variant="outline">
                  <Link href="/inventory/new">
                    <Plus className="h-4 w-4" />
                    Add Manually
                  </Link>
                </Button>
              </div>
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
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    sellingPrice: product.sellingPrice,
                    quantity: product.quantity,
                    reorderLevel: product.reorderLevel,
                    expiryDate: product.expiryDate,
                    imageUrl: product.imageUrl,
                  }}
                  currency={ctx.business.currency}
                  isLowStock={isLowStock}
                  isExpiring={!!isExpiring}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
