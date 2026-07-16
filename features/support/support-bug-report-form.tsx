"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { createSupportTicket } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openWhatsAppChat } from "@/lib/phone";
import { buildBugReportMessage } from "@/lib/support-contact";
import { Bug, Loader2, Mail, MessageCircle, Send } from "lucide-react";

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
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setSuccess(null);
      return false;
    }
    setError(null);
    return true;
  }

  function handleSubmitInApp() {
    if (!requireSummary()) return;
    setSuccess(null);
    startTransition(async () => {
      const result = await createSupportTicket({
        summary,
        details,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        email: userEmail ?? undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Report submitted. Our team will review it shortly.");
      setSummary("");
      setDetails("");
    });
  }

  function handleWhatsApp() {
    if (!requireSummary()) return;
    if (!supportWhatsAppDisplay) {
      setError("WhatsApp support is not configured yet.");
      return;
    }
    // Also save in-app so staff see it in Ops even if chat is closed.
    startTransition(async () => {
      await createSupportTicket({
        summary,
        details,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        email: userEmail ?? undefined,
      }).catch(() => null);
      openWhatsAppChat(supportWhatsAppDisplay, buildMessage());
    });
  }

  function handleEmail() {
    if (!requireSummary()) return;
    if (!supportEmail) {
      setError("Email support is not configured yet.");
      return;
    }
    startTransition(async () => {
      await createSupportTicket({
        summary,
        details,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        email: userEmail ?? undefined,
      }).catch(() => null);
      const body = encodeURIComponent(buildMessage());
      const subject = encodeURIComponent("Zaplex bug report");
      window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    });
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
          Tell us what went wrong. Submit in the app so our team sees it, or
          also send via WhatsApp / email.
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
        {success && (
          <p className="text-sm text-emerald-700 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </p>
        )}

        <Button
          type="button"
          className="w-full gap-2"
          disabled={isPending}
          onClick={handleSubmitInApp}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit report
        </Button>

        {(whatsappConfigured || emailConfigured) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {whatsappConfigured && (
              <Button
                type="button"
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={isPending}
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Also WhatsApp
              </Button>
            )}
            {emailConfigured && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                disabled={isPending}
                onClick={handleEmail}
              >
                <Mail className="h-4 w-4" />
                Also email
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
