import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Phone } from "lucide-react";
import { differenceInDays } from "date-fns";

export default async function DebtsPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const debtors = await prisma.customer.findMany({
    where: { businessId: ctx.businessId, debt: { gt: 0 } },
    orderBy: { debt: "desc" },
    include: {
      sales: {
        where: { isCredit: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const totalDebt = debtors.reduce((sum, d) => sum + Number(d.debt), 0);

  return (
    <>
      <Header
        title="Debt Management"
        subtitle={`₦${totalDebt.toLocaleString()} total outstanding`}
      />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {debtors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium text-emerald-600">No outstanding debts</p>
              <p className="text-sm text-muted-foreground mt-1">
                All customers have paid up. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          debtors.map((debtor) => {
            const lastCreditSale = debtor.sales[0];
            const daysOverdue = lastCreditSale
              ? differenceInDays(new Date(), lastCreditSale.createdAt)
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
                      {formatCurrency(Number(debtor.debt), ctx.business.currency)}
                    </p>
                  </div>
                  {daysOverdue > 0 && (
                    <p className="text-sm text-amber-600 mb-3">
                      ⚠ Outstanding for {daysOverdue} days
                    </p>
                  )}
                  <div className="flex gap-2">
                    {debtor.phone && (
                      <a href={`tel:${debtor.phone}`}>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4" />
                          Call
                        </Button>
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${debtor.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hi ${debtor.name}, this is a friendly reminder about your outstanding balance of ${formatCurrency(Number(debtor.debt), ctx.business.currency)}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="success">
                        WhatsApp Reminder
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </>
  );
}
