"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCustomerDebt, createCustomer } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, UserPlus } from "lucide-react";

export type DebtCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
};

interface AddDebtFormProps {
  customers: DebtCustomerOption[];
  currency: string;
}

export function AddDebtForm({ customers: initialCustomers, currency }: AddDebtFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  function handleAddDebt(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!customerId) {
      setError("Select a customer");
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    startTransition(async () => {
      const result = await addCustomerDebt({
        customerId,
        amount: parsedAmount,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAmount("");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  function handleCreateCustomer() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
      });
      if (result.error || !result.customer) {
        setError(
          typeof result.error === "string" ? result.error : "Could not create customer"
        );
        return;
      }
      const created: DebtCustomerOption = {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        debt: Number(result.customer.debt),
      };
      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(created.id);
      setNewName("");
      setNewPhone("");
      setShowNewCustomer(false);
    });
  }

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <Card className="border-orange-200/60">
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-orange-600" />
            Add debt
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Record an outstanding balance — for old debt or amounts not sold through
            POS.
          </p>
        </div>

        <form onSubmit={handleAddDebt} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="debt-customer">Customer</Label>
            {customers.length > 0 ? (
              <select
                id="debt-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={isPending}
                className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.debt > 0
                      ? ` — owes ${formatCurrency(c.debt, currency)}`
                      : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No customers yet. Add one below.
              </p>
            )}
          </div>

          {!showNewCustomer ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-biz-blue px-0 h-auto"
              onClick={() => setShowNewCustomer(true)}
              disabled={isPending}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              New customer
            </Button>
          ) : (
            <div className="rounded-xl border bg-slate-50/80 p-3 space-y-2">
              <p className="text-sm font-medium">New customer</p>
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isPending}
              />
              <Input
                placeholder="Phone (optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                disabled={isPending}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCustomer}
                  disabled={isPending || !newName.trim()}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save customer"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNewCustomer(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="debt-amount">Amount owed</Label>
            <Input
              id="debt-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              required
            />
            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                Current balance:{" "}
                {formatCurrency(selectedCustomer.debt, currency)}
                {amount && Number(amount) > 0 && (
                  <>
                    {" "}
                    →{" "}
                    {formatCurrency(
                      selectedCustomer.debt + Number(amount),
                      currency
                    )}{" "}
                    after adding
                  </>
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              Debt recorded successfully.
            </p>
          )}

          <Button type="submit" disabled={isPending || !customerId} className="w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add debt"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
