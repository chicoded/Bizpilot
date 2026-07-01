export function normalizeNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, "").replace(/^whatsapp:/i, "");
  if (cleaned.startsWith("+234")) return cleaned;
  if (cleaned.startsWith("234")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

export function extractPhoneFromContact(
  contact: string | null | undefined
): string | null {
  if (!contact) return null;

  const match = contact.match(/(?:\+?234|0)\d{9,10}/);
  if (!match) return null;

  return normalizeNigerianPhone(match[0]);
}

export function resolveCustomerPhone(
  phone: string | null | undefined
): string | null {
  if (!phone?.trim()) return null;

  const extracted = extractPhoneFromContact(phone);
  if (extracted) return extracted;

  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return normalizeNigerianPhone(phone.trim());
  }

  return null;
}

export function toWhatsAppWebUrl(phone: string, message: string): string {
  const digits = normalizeNigerianPhone(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
