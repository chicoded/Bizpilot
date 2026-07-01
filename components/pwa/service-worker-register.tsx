"use client";

import { useEffect } from "react";

function shouldRegisterServiceWorker(hostname: string) {
  if (hostname.endsWith(".vercel.app")) {
    const productionHosts = new Set([
      "bizpilot-phi.vercel.app",
      "bizpilot.vercel.app",
    ]);
    return productionHosts.has(hostname);
  }

  return true;
}

function isStaleChunkError(message: string) {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    (message.includes("webpack-") && message.includes("404"))
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const hostname = window.location.hostname;
    if (!shouldRegisterServiceWorker(hostname)) return;

    let reloaded = false;

    const recoverFromStaleAssets = async () => {
      if (reloaded) return;
      reloaded = true;
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } finally {
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      const message = event.message || "";
      const source = event.filename || "";
      if (
        isStaleChunkError(message) ||
        (source.includes("/_next/static/") && message.includes("MIME"))
      ) {
        void recoverFromStaleAssets();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason ?? "");
      if (isStaleChunkError(reason)) {
        void recoverFromStaleAssets();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const onControllerChange = () => {
      if (!reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch {
        // SW registration failed — app still works online
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
