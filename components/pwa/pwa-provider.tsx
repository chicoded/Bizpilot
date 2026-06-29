"use client";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <OfflineBanner />
      {children}
    </>
  );
}
