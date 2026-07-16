"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { countUnsyncedSales } from "@/lib/sync/queue";
import {
  flushSaleSyncQueue,
  pullCloudProducts,
  pushLocalProducts,
} from "@/lib/sync/sales-sync";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function TeamSyncStatus({ className }: { className?: string }) {
  const { businessId, status } = useLocalData();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    if (!businessId) {
      setPending(0);
      return;
    }
    setPending(await countUnsyncedSales(businessId));
  }, [businessId]);

  const runSync = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    setMessage(null);
    try {
      // 1) Share local products so teammates can see them
      // 2) Upload pending sales
      // 3) Pull authoritative team stock
      const push = await pushLocalProducts(businessId);
      const flush = await flushSaleSyncQueue(businessId);
      const pull = await pullCloudProducts(businessId);
      await refreshCount();
      setMessage(`${push.message}. ${flush.message}. ${pull.message}`);
    } catch {
      setMessage("Could not sync right now.");
    } finally {
      setBusy(false);
    }
  }, [businessId, refreshCount]);

  useEffect(() => {
    if (status === "ready") void refreshCount();
  }, [status, refreshCount]);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      void runSync();
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [runSync]);

  useEffect(() => {
    if (!businessId || status !== "ready") return;
    if (!online) return;
    void runSync();
    const timer = window.setInterval(() => void runSync(), 60_000);
    return () => window.clearInterval(timer);
  }, [businessId, status, online, runSync]);

  if (status !== "ready") return null;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-xs flex flex-wrap items-center gap-2",
        pending > 0
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-border bg-muted/40 text-muted-foreground",
        className
      )}
    >
      {online ? (
        <Cloud className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="flex-1 min-w-0">
        {online
          ? pending > 0
            ? `${pending} sale(s) waiting to sync to team database`
            : "Team sync on — products & sales share to the cloud"
          : pending > 0
            ? `Offline · ${pending} sale(s) will sync when back online`
            : "Offline · selling from this device"}
        {message ? ` · ${message}` : ""}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        disabled={busy || !online}
        onClick={() => void runSync()}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Sync now
      </Button>
    </div>
  );
}
