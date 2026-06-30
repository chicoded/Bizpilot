import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { listExpenses, type ExpensePeriod } from "@/lib/expenses";
import { Header } from "@/components/layout/header";
import { ExpensesPanel } from "@/features/expenses/expenses-panel";

function parsePeriod(value: string | undefined): ExpensePeriod {
  if (value === "week" || value === "month" || value === "all") {
    return value;
  }
  return "month";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const ctx = await requirePageAccess("expenses");

  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const { expenses, total } = await listExpenses(ctx.businessId, period);

  return (
    <>
      <Header title="Expenses" subtitle="Track where your money goes" />
      <main className="p-4 md:p-6 max-w-2xl mx-auto mobile-page">
        <ExpensesPanel
          expenses={expenses}
          total={total}
          currency={ctx.business.currency}
          period={period}
        />
      </main>
    </>
  );
}
