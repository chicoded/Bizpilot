"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  listLocalCustomers,
  listLocalDebtors,
} from "@/lib/local-data/customers";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Phone } from "lucide-react";
import { differenceInDays } from "date-fns";
import { RecordPaymentButton } from "@/features/debts/record-payment-button";
import { AddDebtForm } from "@/features/debts/add-debt-form";

export function DebtsPageClient() {
  const { businessId, currency, status } = useLocalData();
  const [debtors, setDebtors] = useState<
    Awaited<ReturnType<typeof listLocalDebtors>>
  >([]);
  const [customers, setCustomers] = useState<
    Awaited<ReturnType<typeof listLocalCustomers>>
  >([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setDebtors([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [debtorRows, customerRows] = await Promise.all([
        listLocalDebtors(businessId),
        listLocalCustomers(businessId),
      ]);
      setDebtors(debtorRows);
      setCustomers(customerRows);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === "ready") void reload();
  }, [status, reload]);

  const totalDebt = debtors.reduce((sum, d) => sum + d.debt, 0);

  if (loading || status === "loading") {
    return (
      <AppShell title="Debt Management" subtitle="Loading…">
        <Skeleton className="h-64 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Debt Management"
      subtitle={`${formatCurrency(totalDebt, currency)} total outstanding`}
      maxWidth="default"
      className="space-y-4"
    >
      <AddDebtForm
        currency={currency}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          debt: c.debt,
        }))}
        onChanged={reload}
      />

      {debtors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
            <p className="font-medium text-emerald-600">No outstanding debts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the form above to record existing balances, or sell on credit at
              Point of Sale.
            </p>
          </CardContent>
        </Card>
      ) : (
        debtors.map((debtor) => {
          const daysOverdue = debtor.lastCreditSaleAt
            ? differenceInDays(new Date(), new Date(debtor.lastCreditSaleAt))
            : 0;

          return (
            <Card key={debtor.id} className="border-orange-200/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">{debtor.name}</p>
                    {debtor.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {debtor.phone}
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-red-500">
                    {formatCurrency(debtor.debt, currency)}
                  </p>
                </div>
                {daysOverdue > 0 && (
                  <p className="text-sm text-amber-600 mb-3">
                    Outstanding for {daysOverdue} days
                  </p>
                )}
                <div className="flex flex-wrap gap-2 items-start">
                  <RecordPaymentButton
                    customerId={debtor.id}
                    maxAmount={debtor.debt}
                    currency={currency}
                    onChanged={reload}
                  />
                  {debtor.phone && (
                    <>
                      <a href={`tel:${debtor.phone}`}>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4" />
                          Call
                        </Button>
                      </a>
                      <a
                        href={`https://wa.me/${debtor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hi ${debtor.name}, this is a friendly reminder about your outstanding balance of ${formatCurrency(debtor.debt, currency)}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="success">
                          WhatsApp Reminder
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </AppShell>
  );
}
