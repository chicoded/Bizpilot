"use client";

import { useState, useTransition } from "react";
import { sendSupplyRequest } from "@/actions/supply-request";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { openWhatsAppChat } from "@/lib/phone";

export function QuickSupplierReorderButton({
  supplierId,
  supplierName,
  items,
  disabled,
}: {
  supplierId: string;
  supplierName: string;
  items: { productId: string; quantity: number }[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await sendSupplyRequest({
        supplierId,
        items,
        notes: "Low stock reorder from Zaplex",
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.whatsAppUrl) {
        // Fallback when opened after async — openWhatsAppChat still handles blockers
        const url = new URL(result.whatsAppUrl);
        const phone = url.pathname.replace("/", "");
        const text = url.searchParams.get("text") ?? "";
        if (phone) {
          openWhatsAppChat(phone, text);
        } else {
          window.location.assign(result.whatsAppUrl);
        }
      }

      setSuccess(`Reorder opened in WhatsApp for ${supplierName}.`);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        disabled={disabled || isPending || items.length === 0}
        onClick={handleClick}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <MessageCircle className="h-4 w-4" />
            Quick reorder ({items.length})
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && (
        <p className="text-xs text-emerald-700">{success}</p>
      )}
    </div>
  );
}
