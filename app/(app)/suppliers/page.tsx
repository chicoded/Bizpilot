import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default async function SuppliersPage() {
  const ctx = await requirePageAccess("suppliers");

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: ctx.businessId },
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <Header title="Suppliers" subtitle={`${suppliers.length} suppliers`} />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-3">
        {suppliers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Add suppliers when you set up purchase orders.</p>
            </CardContent>
          </Card>
        ) : (
          suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="p-4">
                <p className="font-semibold">{supplier.name}</p>
                {supplier.contact && (
                  <p className="text-sm text-muted-foreground">{supplier.contact}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {supplier._count.products} products
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </>
  );
}
