import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Users, Phone, Plus, ChevronRight } from "lucide-react";

export default async function CustomersPage() {
  const ctx = await requirePageAccess("customers");

  const customers = await prisma.customer.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { lifetimeValue: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      debt: true,
      lifetimeValue: true,
      lastPurchase: true,
    },
  });

  return (
    <AppShell
      title="Customers"
      subtitle={`${customers.length} customers`}
      maxWidth="default"
      actions={
        <Button size="sm" asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      }
    >
      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add customers manually or create them during credit sales at POS."
          action={{ label: "Add customer", href: "/customers/new" }}
        />
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="hover:shadow-glass transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Lifetime value</p>
                      <p className="font-bold text-success">
                        {formatCurrency(
                          Number(customer.lifetimeValue),
                          ctx.business.currency
                        )}
                      </p>
                      {Number(customer.debt) > 0 && (
                        <p className="text-sm font-medium text-destructive">
                          Owes{" "}
                          {formatCurrency(Number(customer.debt), ctx.business.currency)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
