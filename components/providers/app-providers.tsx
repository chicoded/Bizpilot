"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { MonitoringProvider } from "@/components/monitoring/monitoring-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <MonitoringProvider>
        <PWAProvider>{children}</PWAProvider>
      </MonitoringProvider>
    </ClerkProvider>
  );
}
