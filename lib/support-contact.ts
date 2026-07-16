import { toWhatsAppWebUrl } from "@/lib/phone";

/** Public support contacts — set on Vercel as NEXT_PUBLIC_* */
export function getSupportContacts() {
  const whatsapp =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() ||
    "";
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";

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
