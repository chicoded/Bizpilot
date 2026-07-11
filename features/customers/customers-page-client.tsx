"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import { listLocalCustomersWithMeta } from "@/lib/local-data/customers";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Users, Phone, Plus, ChevronRight, HardDrive } from "lucide-react";

export function CustomersPageClient() {
  const { businessId, currency, status } = useLocalData();
  const [customers, setCustomers] = useState<
    Awaited<ReturnType<typeof listLocalCustomersWithMeta>>
  >([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCustomers(await listLocalCustomersWithMeta(businessId));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  if (loading || status === "loading") {
    return (
      <AppShell title="Customers" subtitle="Loading…">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Customers"
      subtitle={`${customers.length} customers · saved on this device`}
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
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 mb-4">
        <HardDrive className="h-4 w-4 shrink-0 text-primary" />
        Stored on this device. Back up via Settings → Backup & storage.
      </div>

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
                        Last purchase:{" "}
                        {formatRelativeDate(new Date(customer.lastPurchase))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Lifetime value</p>
                      <p className="font-bold text-success">
                        {formatCurrency(customer.lifetimeValue, currency)}
                      </p>
                      {customer.debt > 0 && (
                        <p className="text-sm font-medium text-destructive">
                          Owes {formatCurrency(customer.debt, currency)}
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
