"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { MonitoringProvider } from "@/components/monitoring/monitoring-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <ThemeProvider>
        <MonitoringProvider>
          <PWAProvider>
            {children}
            <Toaster />
          </PWAProvider>
        </MonitoringProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
