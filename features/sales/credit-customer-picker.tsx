"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";

export interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  debt: number;
}

interface CreditCustomerPickerProps {
  customers: CustomerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCustomerCreated: (customer: CustomerOption) => void;
}

export function CreditCustomerPicker({
  customers,
  selectedId,
  onSelect,
  onCustomerCreated,
}: CreditCustomerPickerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (result.error || !result.customer) {
        setError(typeof result.error === "string" ? result.error : "Could not create customer");
        return;
      }
      const created: CustomerOption = {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        debt: Number(result.customer.debt),
      };
      onCustomerCreated(created);
      onSelect(created.id);
      setName("");
      setPhone("");
      setShowForm(false);
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
      <Label className="text-sm font-medium text-orange-800">
        Customer (required for credit)
      </Label>

      {customers.length > 0 ? (
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm"
        >
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.debt > 0 ? ` — owes ₦${c.debt.toLocaleString("en-NG")}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-muted-foreground">No customers yet — add one below.</p>
      )}

      {showForm ? (
        <div className="space-y-2 pt-1">
          <Input
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
          <Input
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={isPending || !name.trim()}
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
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add new customer
        </Button>
      )}
    </div>
  );
}
