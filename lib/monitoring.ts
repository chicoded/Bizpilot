/** Server-side monitoring configuration status */

export type MonitoringServiceStatus = {
  id: "sentry" | "posthog";
  label: string;
  configured: boolean;
  keys: { name: string; configured: boolean }[];
  dashboardUrl: string;
  signupUrl: string;
};

export function getMonitoringStatus(): MonitoringServiceStatus[] {
  const sentryClient = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
  const sentryServer = Boolean(process.env.SENTRY_DSN?.trim());
  const posthogKey = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim());

  return [
    {
      id: "sentry",
      label: "Sentry",
      configured: sentryClient || sentryServer,
      keys: [
        { name: "NEXT_PUBLIC_SENTRY_DSN", configured: sentryClient },
        { name: "SENTRY_DSN", configured: sentryServer },
      ],
      dashboardUrl: "https://sentry.io/issues/",
      signupUrl: "https://sentry.io/signup/",
    },
    {
      id: "posthog",
      label: "PostHog",
      configured: posthogKey,
      keys: [
        { name: "NEXT_PUBLIC_POSTHOG_KEY", configured: posthogKey },
      ],
      dashboardUrl: "https://app.posthog.com/events",
      signupUrl: "https://app.posthog.com/signup",
    },
  ];
}
