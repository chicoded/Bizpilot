"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

const sentryDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 0.1,
      });
    }

    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
      });
    }

    setReady(true);
  }, []);

  if (!ready) return <>{children}</>;

  if (posthogKey) {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
  }

  return <>{children}</>;
}

export function identifyUser(userId: string, traits?: Record<string, string>) {
  if (!posthogKey) return;
  posthog.identify(userId, traits);
}

export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>
) {
  if (!posthogKey) return;
  posthog.capture(event, properties);
}
