"use client";

import { useEffect } from "react";

function shouldRegisterServiceWorker(hostname: string) {
  // Vercel preview deployments often use SSO protection, which breaks SW/manifest fetches.
  if (hostname.endsWith(".vercel.app")) {
    const productionHosts = new Set([
      "bizpilot-phi.vercel.app",
      "bizpilot.vercel.app",
    ]);
    return productionHosts.has(hostname);
  }

  // Custom domains (e.g. ritualgames.com.ng) — enable PWA/service worker.
  return true;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const hostname = window.location.hostname;
    if (!shouldRegisterServiceWorker(hostname)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        // Pick up service worker fixes without waiting for the next visit.
        await registration.update();
      } catch {
        // SW registration failed — app still works online
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
