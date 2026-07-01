"use client";

import { useState, useTransition } from "react";
import { sendSupplyRequest } from "@/actions/supply-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageCircle, PackagePlus } from "lucide-react";

type SupplierProduct = {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
};

export function SupplyRequestPanel({
  supplierId,
  supplierName,
  supplierContact,
  products,
}: {
  supplierId: string;
  supplierName: string;
  supplierContact: string | null;
  products: SupplierProduct[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      products.map((p) => [
        p.id,
        p.quantity <= p.reorderLevel
          ? String(Math.max(p.reorderLevel * 2 - p.quantity, p.reorderLevel))
          : "",
      ])
    )
  );
  const [customMessage, setCustomMessage] = useState("");
  const [notes, setNotes] = useState("");

  const hasPhone = Boolean(
    supplierContact && /(?:\+?234|0)\d{9,10}/.test(supplierContact)
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const items = products
      .map((product) => ({
        productId: product.id,
        quantity: Number(quantities[product.id] ?? 0),
      }))
      .filter((item) => item.quantity > 0);

    startTransition(async () => {
      const result = await sendSupplyRequest({
        supplierId,
        items,
        customMessage: customMessage.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.whatsAppUrl) {
        window.open(result.whatsAppUrl, "_blank", "noopener,noreferrer");
      }

      setSuccess(
        `Purchase order saved. WhatsApp opened — tap Send to message ${supplierName}.`
      );

      setQuantities(Object.fromEntries(products.map((p) => [p.id, ""])));
      setNotes("");
      setCustomMessage("");
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackagePlus className="h-4 w-4" />
          Request supply
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasPhone ? (
          <p className="text-sm text-amber-700 rounded-lg bg-amber-50 px-3 py-2">
            Add a phone number to this supplier&apos;s contact field (e.g.{" "}
            08012345678) to open WhatsApp with a pre-filled order message.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Saves a purchase order and opens WhatsApp with your message ready
              to send — no paid API required.
            </p>

            {products.length > 0 ? (
              <div className="space-y-2">
                <Label>Products to order</Label>
                <div className="space-y-2 rounded-lg border divide-y">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} in stock
                          {product.quantity <= product.reorderLevel && (
                            <span className="text-amber-600"> · low stock</span>
                          )}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className="w-20 h-10"
                        placeholder="0"
                        value={quantities[product.id] ?? ""}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customMessage">What do you need?</Label>
                <textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  disabled={isPending}
                  rows={4}
                  placeholder="e.g. 10 cartons of Coke 50cl, 5 packs of Paracetamol..."
                  className="flex w-full rounded-xl border border-input bg-white/90 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-biz-blue/30 disabled:opacity-50"
                />
              </div>
            )}

            {products.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="additionalItems">Additional items (optional)</Label>
                <textarea
                  id="additionalItems"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Any extra items not listed above..."
                  className="flex w-full rounded-xl border border-input bg-white/90 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-biz-blue/30 disabled:opacity-50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Note to supplier (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Please deliver by Friday morning"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 rounded-lg bg-emerald-50 px-3 py-2">
                {success}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Send supply request
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
