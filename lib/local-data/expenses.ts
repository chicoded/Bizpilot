import {
  endOfMonth,
  startOfMonth,
  subDays,
} from "date-fns";
import { getLocalDB } from "@/lib/local-db/database";
import type { LocalExpense } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";
import type { ExpenseCategory } from "@prisma/client";

export type LocalExpensePeriod = "week" | "month" | "all";

export type LocalExpenseListItem = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: Date;
};

function nowIso() {
  return new Date().toISOString();
}

export async function listLocalExpenses(
  businessId: string
): Promise<LocalExpense[]> {
  const db = getLocalDB();
  const expenses = await db.expenses.where("businessId").equals(businessId).toArray();
  return expenses.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function filterExpensesByPeriod(
  expenses: LocalExpense[],
  period: LocalExpensePeriod
) {
  const now = new Date();
  return expenses.filter((expense) => {
    const date = new Date(expense.date);
    if (period === "week") return date >= subDays(now, 7);
    if (period === "month") {
      return date >= startOfMonth(now) && date <= endOfMonth(now);
    }
    return true;
  });
}

export async function listLocalExpensesSummary(
  businessId: string,
  period: LocalExpensePeriod = "month"
) {
  const all = await listLocalExpenses(businessId);
  const expenses = filterExpensesByPeriod(all, period);

  return {
    expenses: expenses.map((expense) => ({
      id: expense.id,
      category: expense.category as ExpenseCategory,
      amount: expense.amount,
      description: expense.description,
      date: new Date(expense.date),
    })) satisfies LocalExpenseListItem[],
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
  };
}

export async function createLocalExpense(
  businessId: string,
  input: {
    category: string;
    amount: number;
    description?: string | null;
    date?: string;
  }
): Promise<LocalExpense> {
  const timestamp = nowIso();
  const expense: LocalExpense = {
    id: localId("exp"),
    businessId,
    category: input.category,
    amount: input.amount,
    description: input.description?.trim() || null,
    date: input.date ?? timestamp.slice(0, 10),
    createdAt: timestamp,
    syncedAt: null,
  };

  await getLocalDB().expenses.put(expense);
  return expense;
}

export async function deleteLocalExpense(
  businessId: string,
  expenseId: string
): Promise<boolean> {
  const db = getLocalDB();
  const expense = await db.expenses.get(expenseId);
  if (!expense || expense.businessId !== businessId) return false;
  await db.expenses.delete(expenseId);
  return true;
}

export async function replaceLocalExpenses(
  businessId: string,
  expenses: LocalExpense[]
): Promise<void> {
  const db = getLocalDB();
  await db.transaction("rw", db.expenses, async () => {
    const existing = await db.expenses.where("businessId").equals(businessId).toArray();
    const incomingIds = new Set(expenses.map((e) => e.id));
    const toDelete = existing.filter((e) => !incomingIds.has(e.id));
    if (toDelete.length > 0) {
      await db.expenses.bulkDelete(toDelete.map((e) => e.id));
    }
    if (expenses.length > 0) {
      await db.expenses.bulkPut(expenses);
    }
  });
}
