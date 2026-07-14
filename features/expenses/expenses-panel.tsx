"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/types";
import type { LocalExpenseListItem, LocalExpensePeriod } from "@/lib/local-data/expenses";
import { createLocalExpense, deleteLocalExpense } from "@/lib/local-data/expenses";
import { useLocalData } from "@/components/providers/local-data-provider";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Loader2, Plus, Trash2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: LocalExpensePeriod; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

interface ExpensesPanelProps {
  expenses: LocalExpenseListItem[];
  total: number;
  currency: string;
  period: LocalExpensePeriod;
  onChanged?: () => void;
}

export function ExpensesPanel({
  expenses,
  total,
  currency,
  period,
  onChanged,
}: ExpensesPanelProps) {
  const router = useRouter();
  const { businessId } = useLocalData();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("FUEL");
  const [error, setError] = useState<string | null>(null);

  const categoryLabel = Object.fromEntries(
    EXPENSE_CATEGORIES.map((cat) => [cat.value, cat.label])
  );

  function handlePeriodChange(next: LocalExpensePeriod) {
    router.push(`/expenses?period=${next}`);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!businessId) {
      setError("Shop data not loaded yet.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const date = String(formData.get("date") ?? "");

    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    startTransition(async () => {
      try {
        await createLocalExpense(businessId, {
          category,
          amount,
          description,
          date: date || undefined,
        });
        form.reset();
        setShowForm(false);
        setCategory("FUEL");
        onChanged?.();
      } catch {
        setError("Could not save expense. Try again.");
      }
    });
  }

  function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?") || !businessId) return;
    startTransition(async () => {
      const deleted = await deleteLocalExpense(businessId, expenseId);
      if (!deleted) {
        setError("Could not delete expense");
        return;
      }
      onChanged?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePeriodChange(option.value)}
            className={cn(
              "pill-filter",
              period === option.value ? "pill-filter-active" : "pill-filter-inactive"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-biz-blue/5 to-transparent">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total expenses</p>
            <p className="text-2xl font-bold text-brand">
              {formatCurrency(total, currency)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {expenses.length} record{expenses.length === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      {!showForm ? (
        <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-5 w-5" />
          Record Expense
        </Button>
      ) : (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0"
                  className="text-2xl h-14 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Note (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g. Generator fuel for the week"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Expense"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-red-500 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2">
          {error}
        </p>
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No expenses recorded for this period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {categoryLabel[expense.category] ?? expense.category}
                  </p>
                  {expense.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {expense.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold text-red-500">
                    {formatCurrency(expense.amount, currency)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                    disabled={isPending}
                    onClick={() => handleDelete(expense.id)}
                    aria-label="Delete expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
