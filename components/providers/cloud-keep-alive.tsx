"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getLastCloudStatus,
  kickstartCloudDatabase,
  pingCloudDatabase,
  subscribeCloudStatus,
  type CloudPingResult,
} from "@/lib/sync/cloud-status";
import { Cloud, CloudOff, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Keep-alive while the app is open: quiet ping every few minutes + on focus/touch. */
const KEEP_ALIVE_MS = 4 * 60 * 1000;
const TOUCH_THROTTLE_MS = 90 * 1000;

export function CloudKeepAlive() {
  const [status, setStatus] = useState<CloudPingResult>(getLastCloudStatus);
  const [waking, setWaking] = useState(false);

  useEffect(() => subscribeCloudStatus(setStatus), []);

  useEffect(() => {
    let cancelled = false;
    let lastTouchPing = 0;

    async function quietPing() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      await pingCloudDatabase({ wake: false });
    }

    void pingCloudDatabase({ wake: true });
    const interval = window.setInterval(() => void quietPing(), KEEP_ALIVE_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void pingCloudDatabase({ wake: true });
      }
    }

    function onOnline() {
      void pingCloudDatabase({ wake: true });
    }

    function onActivity() {
      const now = Date.now();
      if (now - lastTouchPing < TOUCH_THROTTLE_MS) return;
      lastTouchPing = now;
      void pingCloudDatabase({ wake: false });
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  const wake = useCallback(async () => {
    setWaking(true);
    try {
      const result = await kickstartCloudDatabase();
      if (result.status === "online") {
        const { syncTeamData } = await import("@/lib/sync/sales-sync");
        const { getActiveBusinessId } = await import(
          "@/lib/local-data/business"
        );
        const businessId = await getActiveBusinessId();
        if (businessId) await syncTeamData(businessId);
      }
    } finally {
      setWaking(false);
    }
  }, []);

  const showBanner =
    status.status === "sleeping" ||
    status.status === "offline" ||
    (status.status === "unknown" && waking);

  if (!showBanner) return null;

  const isOffline = status.status === "offline";

  return (
    <>
      <div className="h-11 shrink-0 md:h-10" aria-hidden />
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[200] border-b px-3 py-2 text-xs shadow-sm md:left-64",
          isOffline
            ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100"
            : "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/90 dark:text-orange-100"
        )}
        role="status"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          {waking ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : isOffline ? (
            <CloudOff className="h-4 w-4 shrink-0" />
          ) : (
            <Cloud className="h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0 flex-1 font-medium">
            {waking
              ? "Waking cloud database… keep this page open (up to ~1 min)"
              : isOffline
                ? status.message
                : "Cloud database sleeping — team sync paused. Sales still work on this device."}
          </p>
          {!isOffline && (
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={waking}
              onClick={() => void wake()}
            >
              {waking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Wake database
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
