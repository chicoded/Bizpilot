"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  extractPhoneFromContact,
  openWhatsAppChat,
} from "@/lib/phone";
import { MessageCircle } from "lucide-react";

export function SupplierWhatsAppPanel({
  supplierName,
  supplierContact,
  businessName,
}: {
  supplierName: string;
  supplierContact: string | null;
  businessName: string;
}) {
  const phone = extractPhoneFromContact(supplierContact);
  const [message, setMessage] = useState(
    `Hello ${supplierName},\n\nThis is ${businessName}. I would like to place an order.\n\nThank you.`
  );
  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    setError(null);
    if (!phone) {
      setError(
        "Add a phone / WhatsApp number on this supplier (e.g. 08012345678)."
      );
      return;
    }
    const text = message.trim();
    if (!text) {
      setError("Type a message first.");
      return;
    }
    openWhatsAppChat(phone, text);
  }

  return (
    <Card className="border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Message on WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!phone ? (
          <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
            Add a phone number in Phone / WhatsApp above (e.g. 08012345678), then
            you can message this supplier directly.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Opens WhatsApp to {supplierName} ({phone}) with your message ready
              to send.
            </p>
            <div className="space-y-2">
              <Label htmlFor="supplier-wa-message">Message</Label>
              <textarea
                id="supplier-wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="flex w-full rounded-xl border border-input bg-background text-foreground px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-biz-blue/30 dark:focus:ring-primary/30"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSend}
            >
              <MessageCircle className="h-4 w-4" />
              Send on WhatsApp
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
