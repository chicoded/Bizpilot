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

/**
 * Opens the supplier/customer WhatsApp chat with a pre-filled message.
 * Prefer this over window.open after async work — popup blockers often block
 * that; this uses the current user tap more reliably.
 */
export function openWhatsAppChat(phone: string, message: string): boolean {
  if (typeof window === "undefined") return false;

  const url = toWhatsAppWebUrl(phone, message);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.assign(url);
    return true;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
  return true;
}

