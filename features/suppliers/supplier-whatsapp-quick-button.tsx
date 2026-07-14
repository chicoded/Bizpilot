"use client";

import {
  extractPhoneFromContact,
  openWhatsAppChat,
} from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function SupplierWhatsAppQuickButton({
  supplierName,
  contact,
  businessName,
}: {
  supplierName: string;
  contact: string | null;
  businessName: string;
}) {
  const phone = extractPhoneFromContact(contact);
  if (!phone) return null;

  const message = `Hello ${supplierName},\n\nThis is ${businessName}. I would like to place an order.\n\nThank you.`;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openWhatsAppChat(phone, message);
      }}
      aria-label={`WhatsApp ${supplierName}`}
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </Button>
  );
}
