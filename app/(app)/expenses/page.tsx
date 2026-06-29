"use client";

import { useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
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
import { createExpense } from "@/actions/business";
import { EXPENSE_CATEGORIES } from "@/types";
import { Loader2, Plus } from "lucide-react";

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("FUEL");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    startTransition(async () => {
      await createExpense(formData);
      setShowForm(false);
      e.currentTarget.reset();
    });
  }

  return (
    <>
      <Header title="Expenses" subtitle="Track where your money goes" />
      <main className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
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
                    required
                    placeholder="0"
                    className="text-2xl h-14 font-bold"
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

        <p className="text-center text-sm text-muted-foreground">
          AI will alert you when expenses spike — like generator fuel increasing 28%.
        </p>
      </main>
    </>
  );
}
