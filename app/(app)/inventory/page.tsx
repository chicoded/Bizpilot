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
import { RepairDatabaseButton } from "@/components/inventory/repair-database-button";

export const dynamic = "force-dynamic";

function InventoryLoadError({ message }: { message: string }) {
  const schemaMismatch = /imageUrl|schema|column|products table/i.test(message);

  return (
    <>
      <Header title="Inventory" subtitle="Could not load" />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <Package className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="font-semibold text-lg">Could not load inventory</h2>
            <p className="text-sm text-muted-foreground">
              {schemaMismatch
                ? "Database update required."
                : message}
            </p>
            {schemaMismatch && <RepairDatabaseButton />}
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/inventory">Try again</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default async function InventoryPage() {
  try {
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
                  Scan a barcode or add your first product manually to start
                  selling.
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
                    currency={ctx.business.currency ?? "NGN"}
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
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Inventory page failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Product data failed to load. Please try again.";
    return <InventoryLoadError message={message} />;
  }
}
