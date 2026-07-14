import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { getSupplierWithProducts } from "@/lib/suppliers";
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { SupplyRequestPanel } from "@/features/suppliers/supply-request-panel";
import { SupplierWhatsAppPanel } from "@/features/suppliers/supplier-whatsapp-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Package, ChevronRight } from "lucide-react";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("suppliers");

  const { id } = await params;

  const supplier = await getSupplierWithProducts(ctx.businessId, id);

  if (!supplier) notFound();

  return (
    <>
      <SupplierForm
        mode="edit"
        supplierId={supplier.id}
        canDelete={supplier._count.purchaseOrders === 0}
        defaultValues={{
          name: supplier.name,
          contact: supplier.contact ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
        }}
      />
      <section className="p-4 md:p-6 max-w-lg mx-auto -mt-2 pb-8 mobile-page space-y-4">
        <SupplierWhatsAppPanel
          supplierName={supplier.name}
          supplierContact={supplier.contact}
          businessName={ctx.business.name}
        />
        <SupplyRequestPanel
          supplierId={supplier.id}
          supplierName={supplier.name}
          supplierContact={supplier.contact}
          businessName={ctx.business.name}
          businessPhone={ctx.business.phone}
          currency={ctx.business.currency}
          products={supplier.products.map((p) => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            reorderLevel: p.reorderLevel,
          }))}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Linked products ({supplier.products.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {supplier.products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No products linked yet. Assign this supplier when adding or editing
                inventory items.
              </p>
            ) : (
              supplier.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/inventory/${product.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.category ?? "Uncategorized"} · {product.quantity} in stock
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-biz-emerald">
                      {formatCurrency(
                        Number(product.sellingPrice),
                        ctx.business.currency
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
