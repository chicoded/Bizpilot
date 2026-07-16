import Link from "next/link";
import { SupportBugReportForm } from "@/features/support/support-bug-report-form";
import { getSupportContacts } from "@/lib/support-contact";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const dynamic = "force-dynamic";

export default function PublicSupportPage() {
  const contacts = getSupportContacts();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle variant="full" />
      </div>
      <div className="mx-auto w-full max-w-lg space-y-6 pt-10 pb-16">
        <div className="text-center">
          <Link href="/" className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-biz-gradient text-lg font-bold text-white">
            Z
          </Link>
          <h1 className="text-2xl font-bold">Customer support</h1>
          <p className="mt-2 text-muted-foreground">
            Report a bug or ask a question. Reach us on WhatsApp or email.
          </p>
        </div>

        <SupportBugReportForm
          whatsappConfigured={contacts.hasWhatsApp}
          emailConfigured={contacts.hasEmail}
          supportEmail={contacts.email}
          supportWhatsAppDisplay={contacts.whatsapp}
        />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/settings/support" className="text-biz-blue underline">
            Open support in the app
          </Link>
        </p>
      </div>
    </div>
  );
}
