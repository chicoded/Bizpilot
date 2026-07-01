import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Plus, ChevronRight, Mail, MapPin, ClipboardList } from "lucide-react";

export default async function SuppliersPage() {
  const ctx = await requirePageAccess("suppliers");

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <AppShell
      title="Suppliers"
      subtitle={`${suppliers.length} suppliers`}
      maxWidth="default"
      className="space-y-4"
    >
        <Button size="lg" variant="outline" className="w-full" asChild>
          <Link href="/suppliers/orders">
            <ClipboardList className="h-5 w-5" />
            Purchase orders
          </Link>
        </Button>

        <Button size="lg" className="w-full" asChild>
          <Link href="/suppliers/new">
            <Plus className="h-5 w-5" />
            Add Supplier
          </Link>
        </Button>

        {suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Add suppliers to link products and track purchase orders."
            action={{ label: "Add supplier", href: "/suppliers/new" }}
          />
        ) : (
          suppliers.map((supplier) => (
            <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
              <Card className="hover:shadow-glass transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{supplier.name}</p>
                    {supplier.contact && (
                      <p className="text-sm text-muted-foreground">{supplier.contact}</p>
                    )}
                    {supplier.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {supplier.email}
                      </p>
                    )}
                    {supplier.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{supplier.address}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {supplier._count.products} product
                      {supplier._count.products === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
    </AppShell>
  );
}
