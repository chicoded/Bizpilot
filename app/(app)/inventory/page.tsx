import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { Role } from "@prisma/client";
import { canAccessSection } from "@/lib/permissions";
import { listInventoryProducts } from "@/lib/products";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { addDays } from "date-fns";
import { InventoryList } from "@/features/inventory/inventory-list";
import { ScanToAddProductButton } from "@/features/inventory/scan-to-add-button";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const ctx = await requirePageAccess("inventory");
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
    <AppShell
      title="Inventory"
      subtitle={`${products.length} products`}
      actions={
        <Button size="sm" asChild>
          <Link href="/inventory/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      }
    >
      {products.length > 0 && <ScanToAddProductButton />}

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

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Scan a barcode or add your first product manually to start selling."
          action={{ label: "Add manually", href: "/inventory/new" }}
        >
          <div className="mb-4 w-full max-w-xs">
            <ScanToAddProductButton />
          </div>
        </EmptyState>
      ) : (
        <InventoryList
          products={products}
          currency={ctx.business.currency ?? "NGN"}
        />
      )}
    </AppShell>
  );
}
