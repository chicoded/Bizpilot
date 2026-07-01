import type { SaleReceipt } from "@/lib/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";

const paymentLabel = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

export type ReceiptBusinessInfo = {
  name: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
};

export function formatReceiptText(
  business: ReceiptBusinessInfo,
  sale: SaleReceipt
): string {
  const lines: string[] = [
    business.name,
    "—".repeat(Math.min(business.name.length, 24)),
    "SALES RECEIPT",
  ];

  if (business.phone) lines.push(business.phone);
  if (business.address) lines.push(business.address);

  lines.push(
    "",
    formatDate(sale.createdAt),
    `Receipt #${sale.id.slice(-8).toUpperCase()}`,
    ""
  );

  if (sale.customer) {
    lines.push(`Customer: ${sale.customer.name}`);
    if (sale.customer.phone) lines.push(sale.customer.phone);
    lines.push("");
  }

  for (const item of sale.items) {
    lines.push(item.name);
    lines.push(
      `  ${item.quantity} x ${formatCurrency(item.sellingPrice, business.currency)} = ${formatCurrency(item.total, business.currency)}`
    );
  }

  lines.push(
    "",
    `Subtotal: ${formatCurrency(sale.subtotal, business.currency)}`
  );

  if (sale.discount > 0) {
    lines.push(`Discount: -${formatCurrency(sale.discount, business.currency)}`);
  }
  if (sale.tax > 0) {
    lines.push(`Tax: ${formatCurrency(sale.tax, business.currency)}`);
  }

  const method = paymentLabel[sale.paymentMethod] ?? sale.paymentMethod;
  lines.push(
    `TOTAL: ${formatCurrency(sale.total, business.currency)}`,
    `Payment: ${method}${sale.isCredit ? " (Credit)" : ""}`,
    "",
    "Thank you for your purchase!"
  );

  return lines.join("\n");
}

export function whatsAppShareUrl(message: string, phone?: string | null): string {
  const encoded = encodeURIComponent(message);
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits) return `https://wa.me/${digits}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
