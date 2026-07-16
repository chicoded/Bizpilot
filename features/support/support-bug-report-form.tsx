"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openWhatsAppChat } from "@/lib/phone";
import { buildBugReportMessage } from "@/lib/support-contact";
import { Bug, Mail, MessageCircle } from "lucide-react";

interface SupportBugReportFormProps {
  businessName?: string | null;
  whatsappConfigured: boolean;
  emailConfigured: boolean;
  supportEmail?: string | null;
  supportWhatsAppDisplay?: string | null;
}

export function SupportBugReportForm({
  businessName,
  whatsappConfigured,
  emailConfigured,
  supportEmail,
  supportWhatsAppDisplay,
}: SupportBugReportFormProps) {
  const { user } = useUser();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  function buildMessage() {
    return buildBugReportMessage({
      summary,
      details,
      businessName,
      userEmail,
      pageUrl: typeof window !== "undefined" ? window.location.href : null,
    });
  }

  function requireSummary(): boolean {
    if (summary.trim().length < 5) {
      setError(
        "Please describe the bug in a short sentence (at least 5 characters)."
      );
      return false;
    }
    setError(null);
    return true;
  }

  function handleWhatsApp() {
    if (!requireSummary()) return;
    if (!supportWhatsAppDisplay) {
      setError("WhatsApp support is not configured yet.");
      return;
    }
    openWhatsAppChat(supportWhatsAppDisplay, buildMessage());
  }

  function handleEmail() {
    if (!requireSummary()) return;
    if (!supportEmail) {
      setError("Email support is not configured yet.");
      return;
    }
    const body = encodeURIComponent(buildMessage());
    const subject = encodeURIComponent("Zaplex bug report");
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bug className="h-5 w-5" />
          Report a bug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tell us what went wrong. We&apos;ll open WhatsApp or your email app
          with the report ready to send.
        </p>

        <div className="space-y-2">
          <Label htmlFor="bug-summary">What happened? *</Label>
          <Input
            id="bug-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Sale saved but stock did not reduce"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bug-details">More details (optional)</Label>
          <textarea
            id="bug-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What were you trying to do? Any error message?"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/40">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {whatsappConfigured && (
            <Button
              type="button"
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Send on WhatsApp
            </Button>
          )}
          {emailConfigured && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleEmail}
            >
              <Mail className="h-4 w-4" />
              Send by email
              {supportEmail ? (
                <span className="sr-only"> to {supportEmail}</span>
              ) : null}
            </Button>
          )}
        </div>

        {!whatsappConfigured && !emailConfigured && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Support contacts are not set yet. Add{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPPORT_WHATSAPP</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPPORT_EMAIL</code> on
            Vercel.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
