import { getLocalDB } from "@/lib/local-db/database";
import type { LocalExpense } from "@/lib/local-db/types";
import { localId } from "@/lib/local-data/id";

function nowIso() {
  return new Date().toISOString();
}

export async function listLocalExpenses(
  businessId: string
): Promise<LocalExpense[]> {
  const db = getLocalDB();
  const expenses = await db.expenses.where({ businessId }).toArray();
  return expenses.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
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
    const existing = await db.expenses.where({ businessId }).toArray();
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
