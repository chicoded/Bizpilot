import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
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
    <>
      <Header title="Suppliers" subtitle={`${suppliers.length} suppliers`} />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 mobile-page">
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
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No suppliers yet. Add one to link products and track purchase orders.</p>
            </CardContent>
          </Card>
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
      </main>
    </>
  );
}
