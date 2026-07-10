"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, AlertTriangle, HardDrive } from "lucide-react";
import { addDays } from "date-fns";
import { InventoryList } from "@/features/inventory/inventory-list";
import { ScanToAddProductButton } from "@/features/inventory/scan-to-add-button";
import { useLocalProducts } from "@/hooks/use-local-products";
import { useLocalData } from "@/components/providers/local-data-provider";

export function InventoryPageClient() {
  const { currency } = useLocalData();
  const { products, loading } = useLocalProducts();

  const normalizedProducts = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        sellingPrice: product.sellingPrice,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
        imageUrl: product.imageUrl,
      })),
    [products]
  );

  const lowStockCount = normalizedProducts.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;
  const expiringCount = normalizedProducts.filter(
    (p) =>
      p.expiryDate &&
      p.expiryDate <= addDays(new Date(), 30) &&
      p.expiryDate >= new Date()
  ).length;

  if (loading) {
    return (
      <AppShell title="Inventory" subtitle="Loading local products…">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inventory"
      subtitle={`${normalizedProducts.length} products · saved on this device`}
      actions={
        <Button size="sm" asChild>
          <Link href="/inventory/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      }
    >
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <HardDrive className="h-4 w-4 shrink-0 text-primary" />
        Stored on this phone. Set Gmail backup in Settings → Backup & storage.
      </div>

      {normalizedProducts.length > 0 && <ScanToAddProductButton />}

      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {lowStockCount > 0 && (
            <StatusChip
              icon={Package}
              label={`${lowStockCount} need restocking`}
              href="/inventory/low-stock"
              variant="warning"
            />
          )}
          {expiringCount > 0 && (
            <StatusChip
              icon={AlertTriangle}
              label={`${expiringCount} expiring soon`}
              href="/inventory"
              variant="danger"
            />
          )}
        </div>
      )}

      {normalizedProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product — it saves on this device instantly, no database needed."
          action={{ label: "Add manually", href: "/inventory/new" }}
        >
          <div className="mb-4 w-full max-w-xs">
            <ScanToAddProductButton />
          </div>
        </EmptyState>
      ) : (
        <InventoryList
          products={normalizedProducts}
          currency={currency}
        />
      )}
    </AppShell>
  );
}
