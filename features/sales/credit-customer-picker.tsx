"use client";

import { useState, useTransition } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { createLocalCustomer } from "@/lib/local-data/customers";
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
  const { businessId } = useLocalData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim() || !businessId) return;
    setError(null);
    startTransition(async () => {
      const created = await createLocalCustomer(businessId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      const option: CustomerOption = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        debt: created.debt,
      };
      onCustomerCreated(option);
      onSelect(created.id);
      setName("");
      setPhone("");
      setShowForm(false);
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/30 p-3">
      <Label className="text-sm font-medium text-orange-800 dark:text-orange-200">
        Customer (required for credit)
      </Label>

      {customers.length > 0 ? (
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="select-native"
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
