"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createSupportTicket } from "@/actions/support";
import { REVIEW_MARKER } from "@/features/feedback/review-marker";

/**
 * Asks a shop owner for a review, and routes it to the support inbox the team
 * already reads.
 *
 * Deliberately reuses support tickets rather than adding a review table: the
 * bottleneck is not storage, it is having anything real to publish. A review
 * arrives tagged, someone reads it, and if the owner is happy to be quoted it
 * gets copied into features/landing/reviews-data.ts and appears on the site.
 *
 * Nothing here publishes automatically. A quote goes public only after a person
 * has read it and confirmed the shop is willing to be named.
 */
export function LeaveReviewCard() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const words = String(data.get("words") ?? "").trim();
    const consent = data.get("consent") === "on";

    if (words.length < 12) {
      setError("Tell us a little more — a sentence or two is plenty.");
      return;
    }

    startTransition(async () => {
      const result = await createSupportTicket({
        // Marked so it can be filtered out of genuine support in the inbox.
        summary: `${REVIEW_MARKER} ${words.slice(0, 80)}`,
        details: [
          words,
          "",
          consent
            ? "Happy to be quoted on the website with shop name."
            : "Does NOT want to be quoted publicly — feedback only.",
        ].join("\n"),
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      form.reset();
    });
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Thank you — that helps</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A person reads every one of these. If you said we could quote you,
              we will check with you before anything goes on the website.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Star className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground">
              How is Zaplex working for your shop?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Good or bad. It goes to a person, not a form that nobody opens.
            </p>

            {/* The survey lives outside the app and opens in its own tab, so
                nobody loses their place in the shop to answer it. */}
            <p className="mt-2 text-sm text-muted-foreground">
              Got more to say?{" "}
              <Link
                href="/survey"
                target="_blank"
                rel="noopener"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Answer seven questions instead
              </Link>{" "}
              — you can record your answers rather than typing.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="words" className="sr-only">
                  Your experience
                </Label>
                <textarea
                  id="words"
                  name="words"
                  rows={4}
                  required
                  disabled={pending}
                  placeholder="What is better since you started using it? What still gets in your way?"
                  className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                />
              </div>

              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="consent"
                  disabled={pending}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary"
                />
                You may quote me on the Zaplex website, with my shop name.
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {pending ? "Sending…" : "Send feedback"}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
