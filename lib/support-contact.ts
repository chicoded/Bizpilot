import { toWhatsAppWebUrl } from "@/lib/phone";

/** Built-in defaults so support works even before Vercel env is set. */
const DEFAULT_SUPPORT_WHATSAPP = "09167076853";
const DEFAULT_SUPPORT_EMAIL = "chinazamuoghalu1@gmail.com";

/** Public support contacts — override on Vercel with NEXT_PUBLIC_* if needed */
export function getSupportContacts() {
  const whatsapp =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() ||
    DEFAULT_SUPPORT_WHATSAPP;
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;

  return {
    whatsapp: whatsapp || null,
    email: email || null,
    hasWhatsApp: Boolean(whatsapp),
    hasEmail: Boolean(email),
    configured: Boolean(whatsapp || email),
  };
}

export function buildBugReportMessage(input: {
  summary: string;
  details?: string;
  businessName?: string | null;
  userEmail?: string | null;
  pageUrl?: string | null;
}) {
  const lines = [
    "Zaplex bug report",
    "",
    `What happened: ${input.summary.trim()}`,
  ];

  if (input.details?.trim()) {
    lines.push("", `Details: ${input.details.trim()}`);
  }
  if (input.businessName) {
    lines.push("", `Business: ${input.businessName}`);
  }
  if (input.userEmail) {
    lines.push(`Account: ${input.userEmail}`);
  }
  if (input.pageUrl) {
    lines.push(`Page: ${input.pageUrl}`);
  }

  return lines.join("\n");
}

export function supportWhatsAppUrl(message: string): string | null {
  const { whatsapp } = getSupportContacts();
  if (!whatsapp) return null;
  return toWhatsAppWebUrl(whatsapp, message);
}

export function supportMailtoUrl(message: string, subject = "Zaplex bug report"): string | null {
  const { email } = getSupportContacts();
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
