import { prisma } from "@/lib/db";
import type { ExpenseCategory } from "@prisma/client";
import { endOfMonth, startOfMonth, subDays } from "date-fns";

export type ExpensePeriod = "week" | "month" | "all";

export type ExpenseListItem = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: Date;
};

function periodDateFilter(period: ExpensePeriod) {
  const now = new Date();
  if (period === "week") {
    return { gte: subDays(now, 7) };
  }
  if (period === "month") {
    return { gte: startOfMonth(now), lte: endOfMonth(now) };
  }
  return undefined;
}

export async function listExpenses(
  businessId: string,
  period: ExpensePeriod = "month"
) {
  const dateFilter = periodDateFilter(period);

  const expenses = await prisma.expense.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      category: true,
      amount: true,
      description: true,
      date: true,
    },
    take: period === "all" ? 200 : 100,
  });

  const items: ExpenseListItem[] = expenses.map((expense) => ({
    id: expense.id,
    category: expense.category,
    amount: Number(expense.amount),
    description: expense.description,
    date: expense.date,
  }));

  const total = items.reduce((sum, expense) => sum + expense.amount, 0);

  const byCategory = items.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});

  return { expenses: items, total, byCategory };
}
