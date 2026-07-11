"use client";

import { useState, useTransition } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { recordLocalDebtPayment } from "@/lib/local-data/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface RecordPaymentButtonProps {
  customerId: string;
  maxAmount: number;
  currency: string;
  onChanged?: () => void;
}

export function RecordPaymentButton({
  customerId,
  maxAmount,
  currency,
  onChanged,
}: RecordPaymentButtonProps) {
  const { businessId } = useLocalData();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount.toString());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    if (!businessId) {
      setError("Shop data not loaded yet.");
      return;
    }

    startTransition(async () => {
      const result = await recordLocalDebtPayment(
        businessId,
        customerId,
        Number(amount)
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onChanged?.();
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Record Payment
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={maxAmount}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-28"
        />
        <Button size="sm" onClick={handlePay} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Outstanding: {maxAmount.toLocaleString("en-NG")} {currency}
      </p>
    </div>
  );
}
