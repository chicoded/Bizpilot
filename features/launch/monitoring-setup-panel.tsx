"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/components/monitoring/monitoring-provider";
import { toast } from "@/hooks/use-toast";
import type { MonitoringServiceStatus } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

interface MonitoringSetupPanelProps {
  services: MonitoringServiceStatus[];
}

export function MonitoringSetupPanel({ services }: MonitoringSetupPanelProps) {
  const [sentrySent, setSentrySent] = useState(false);
  const [posthogSent, setPosthogSent] = useState(false);

  const allConfigured = services.every((s) => s.configured);

  function sendSentryTest() {
    const error = new Error("Zaplex launch checklist — Sentry test error");
    Sentry.captureException(error);
    setSentrySent(true);
    toast({
      title: "Sentry test sent",
      description: "Open your Sentry Issues dashboard — it may take up to a minute.",
      variant: "success",
    });
  }

  function sendPostHogTest() {
    trackEvent("launch_checklist_test", {
      source: "monitoring_setup",
      timestamp: Date.now(),
    });
    setPosthogSent(true);
    toast({
      title: "PostHog test event sent",
      description: "Check Live events in PostHog for launch_checklist_test.",
      variant: "success",
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Monitoring & analytics</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Phase 2 after manual QA — catch production errors and see how
              shops use Zaplex.
            </p>
          </div>
          {allConfigured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Keys configured
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            Create free accounts at{" "}
            <a
              href="https://sentry.io/signup/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              Sentry
            </a>{" "}
            and{" "}
            <a
              href="https://app.posthog.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              PostHog
            </a>
          </li>
          <li>
            In Vercel → <strong>Settings → Environments</strong>, add the keys
            below for <strong>Production</strong>
          </li>
          <li>Redeploy, then use the test buttons here to verify</li>
        </ol>

        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "rounded-xl border p-4 space-y-3",
                service.configured
                  ? "border-success/30 bg-success/5"
                  : "border-border"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-sm flex items-center gap-2">
                  {service.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {service.label}
                </p>
                <a
                  href={service.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline inline-flex items-center gap-1"
                >
                  Open dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <ul className="space-y-1">
                {service.keys.map((key) => (
                  <li
                    key={key.name}
                    className="flex items-center gap-2 text-xs font-mono"
                  >
                    {key.configured ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={
                        key.configured ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {key.name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {service.id === "sentry" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!service.configured}
                    onClick={sendSentryTest}
                  >
                    {sentrySent ? "Test sent ✓" : "Send Sentry test error"}
                  </Button>
                )}
                {service.id === "posthog" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!service.configured}
                    onClick={sendPostHogTest}
                  >
                    {posthogSent ? "Event sent ✓" : "Send PostHog test event"}
                  </Button>
                )}
                {!service.configured && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={service.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Sign up
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Optional for beta, but strongly recommended before onboarding many
          shops. Errors in POS or billing will show in Sentry; usage patterns
          show in PostHog.
        </p>
      </CardContent>
    </Card>
  );
}
