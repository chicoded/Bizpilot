import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";
import type { PaymentTransaction } from "@prisma/client";

interface PaymentHistoryProps {
  transactions: PaymentTransaction[];
}

export function PaymentHistory({ transactions }: PaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No payments yet. Subscribe to a plan to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{tx.plan} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.createdAt)} · {tx.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(Number(tx.amount))}</p>
                  <p
                    className={`text-xs font-medium ${
                      tx.status === "success"
                        ? "text-emerald-600"
                        : tx.status === "pending"
                          ? "text-amber-600"
                          : "text-red-500"
                    }`}
                  >
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
