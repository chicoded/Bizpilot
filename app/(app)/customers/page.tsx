import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Users, Phone } from "lucide-react";

export default async function CustomersPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const customers = await prisma.customer.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { lifetimeValue: "desc" },
  });

  return (
    <>
      <Header title="Customers" subtitle={`${customers.length} customers`} />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-3">
        {customers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Customers are created when you make credit sales at POS.</p>
            </CardContent>
          </Card>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  )}
                  {customer.lastPurchase && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last purchase: {formatRelativeDate(customer.lastPurchase)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Lifetime value</p>
                  <p className="font-bold text-biz-emerald">
                    {formatCurrency(Number(customer.lifetimeValue), ctx.business.currency)}
                  </p>
                  {Number(customer.debt) > 0 && (
                    <p className="text-sm font-medium text-red-500">
                      Owes {formatCurrency(Number(customer.debt), ctx.business.currency)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </>
  );
}
