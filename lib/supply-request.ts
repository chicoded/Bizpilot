type SupplyRequestItem = {
  name: string;
  quantity: number;
  currentStock?: number;
  unitPrice?: number;
};

export function formatSupplyRequestMessage({
  businessName,
  businessPhone,
  supplierName,
  items,
  customMessage,
  notes,
  currency,
}: {
  businessName: string;
  businessPhone?: string | null;
  supplierName: string;
  items: SupplyRequestItem[];
  customMessage?: string;
  notes?: string;
  currency: string;
}): string {
  const lines: string[] = [
    `📦 *Supply Request from ${businessName}*`,
    "",
    `Hello ${supplierName},`,
    "",
  ];

  if (items.length > 0) {
    lines.push("We would like to order:");
    lines.push("");
    for (const item of items) {
      let line = `• *${item.name}* — ${item.quantity} units`;
      if (item.currentStock !== undefined) {
        line += ` (in stock: ${item.currentStock})`;
      }
      if (item.unitPrice !== undefined && currency === "NGN") {
        line += ` @ ₦${item.unitPrice.toLocaleString()}`;
      }
      lines.push(line);
    }
    lines.push("");
  }

  if (customMessage?.trim()) {
    lines.push(customMessage.trim());
    lines.push("");
  }

  if (notes?.trim()) {
    lines.push(`Note: ${notes.trim()}`);
    lines.push("");
  }

  lines.push("Thank you!");
  lines.push(businessName);
  if (businessPhone?.trim()) {
    lines.push(businessPhone.trim());
  }

  return lines.join("\n");
}
