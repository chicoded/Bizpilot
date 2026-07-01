import { requirePageAccess } from "@/lib/auth";
import { listExpenses, type ExpensePeriod } from "@/lib/expenses";
import { AppShell } from "@/components/layout/app-shell";
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
    <AppShell title="Expenses" subtitle="Track where your money goes" maxWidth="narrow">
      <ExpensesPanel
          expenses={expenses}
          total={total}
          currency={ctx.business.currency}
          period={period}
        />
    </AppShell>
  );
}
