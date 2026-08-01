import type { Metadata } from "next";
import Link from "next/link";
import { ZaplexMark } from "@/components/brand/zaplex-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SurveyForm } from "@/features/survey/survey-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tell us what is not working — Zaplex",
  description:
    "Seven short questions about running your shop. Type your answers or record them.",
  // A research form has no business being indexed.
  robots: { index: false, follow: false },
};

/**
 * Standalone survey — no sign-in, no app shell, shareable as a plain link.
 *
 * Deliberately outside the authenticated app. The answers worth most come from
 * shop owners who tried Zaplex and left, or looked and never signed up, and
 * neither can log in. Putting this behind sign-in would have surveyed only the
 * people already happy enough to stay, which is the one group whose problems
 * are least urgent.
 *
 * Send it by WhatsApp, print the link on a receipt, read it out — it works for
 * anyone with a browser.
 */
export default function PublicSurveyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ZaplexMark className="h-7 w-7" title={null} />
            <span className="font-semibold tracking-tight">Zaplex</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Tell us what is not working
        </h1>
        <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
          Seven questions about running your shop. You do not need an account,
          and you do not have to answer all of them.
        </p>

        <div className="mt-8">
          <SurveyForm showIdentityFields />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-2xl px-5 py-8 text-sm text-muted-foreground">
          <p>
            Your answers go to the people who build Zaplex. Nothing you write
            here is published anywhere without asking you first.
          </p>
        </div>
      </footer>
    </div>
  );
}
