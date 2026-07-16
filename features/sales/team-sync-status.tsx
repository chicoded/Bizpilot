"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocalData } from "@/components/providers/local-data-provider";
import { countUnsyncedSales } from "@/lib/sync/queue";
import {
  flushSaleSyncQueue,
  pullCloudProducts,
  pushLocalProducts,
  reloadTeamCatalog,
  listSaleSyncProblems,
  dismissFailedSaleSyncs,
} from "@/lib/sync/sales-sync";
import { switchActiveBusiness } from "@/actions/switch-business";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, Loader2, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type MembershipOption = {
  businessId: string;
  businessName: string;
  role: string;
  productCount: number;
};

export function TeamSyncStatus({ className }: { className?: string }) {
  const { businessId, businessName, status, refresh } = useLocalData();
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [cloudProductCount, setCloudProductCount] = useState<number | null>(null);
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [saleProblems, setSaleProblems] = useState<
    { id: string; status: string; lastError: string | null }[]
  >([]);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [switching, startSwitch] = useTransition();

  const refreshCount = useCallback(async () => {
    if (!businessId) {
      setPending(0);
      setSaleProblems([]);
      return;
    }
    setPending(await countUnsyncedSales(businessId));
    setSaleProblems(await listSaleSyncProblems(businessId));
  }, [businessId]);

  const loadContext = useCallback(async () => {
    try {
      const res = await fetch("/api/context", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        role?: string | null;
        productCount?: number;
        memberships?: MembershipOption[];
        businessId?: string | null;
        businessName?: string | null;
      };
      setRole(data.role ?? null);
      setCloudProductCount(
        typeof data.productCount === "number" ? data.productCount : null
      );
      setMemberships(data.memberships ?? []);
    } catch {
      // ignore
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    setMessage(null);
    try {
      await loadContext();
      const { pingCloudDatabase, isCloudUsable } = await import(
        "@/lib/sync/cloud-status"
      );
      const cloud = await pingCloudDatabase({ wake: true });
      setCloudStatus(cloud.message);

      if (!isCloudUsable(cloud.status)) {
        setMessage(cloud.message);
        await refreshCount();
        return;
      }

      const push = await pushLocalProducts(businessId);
      const flush = await flushSaleSyncQueue(businessId);
      const pull = await pullCloudProducts(businessId);
      await refreshCount();
      await loadContext();

      let text = `${cloud.message}. ${push.message}. ${flush.message}. ${pull.message}`;
      if (
        cloudProductCount === 0 ||
        (typeof pull.updated === "number" &&
          pull.updated === 0 &&
          pull.added === 0 &&
          pull.message.includes("No cloud"))
      ) {
        text +=
          " · This shop has no cloud products — switch shop if you joined a team.";
      }
      setMessage(text);
    } catch {
      setMessage("Could not sync right now - using local storage.");
    } finally {
      setBusy(false);
    }
  }, [businessId, refreshCount, loadContext, cloudProductCount]);

  const runReloadFromTeam = useCallback(async () => {
    if (!businessId) return;
    const confirmed = window.confirm(
      `Reload products for "${businessName}" from the team database?\n\nMake sure this is the correct shop (not a personal empty shop).`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      const { push, pull } = await reloadTeamCatalog(businessId);
      const flush = await flushSaleSyncQueue(businessId);
      await refreshCount();
      await loadContext();
      const text = `${push.message}. ${pull.message}. ${flush.message}`;
      setMessage(text);
      toast({
        title: "Team catalog reloaded",
        description: `${pull.message} · Shop: ${businessName}`,
        variant: "success",
      });
    } catch {
      setMessage("Could not reload team catalog.");
      toast({
        title: "Reload failed",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [businessId, businessName, refreshCount, loadContext]);

  function onSwitchShop(nextBusinessId: string) {
    if (!nextBusinessId || nextBusinessId === businessId) return;
    startSwitch(async () => {
      const result = await switchActiveBusiness(nextBusinessId);
      if ("error" in result && result.error) {
        toast({
          title: "Could not switch shop",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Switched shop",
        description: `${result.businessName} · ${result.role}`,
        variant: "success",
      });
      await refresh();
      router.refresh();
      window.setTimeout(() => window.location.reload(), 400);
    });
  }

  useEffect(() => {
    if (status === "ready") {
      void refreshCount();
      void loadContext();
    }
  }, [status, refreshCount, loadContext]);

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

  const otherShops = memberships.filter((m) => m.businessId !== businessId);
  const looksEmpty =
    cloudProductCount === 0 && otherShops.some((m) => m.productCount > 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-xs flex flex-wrap items-center gap-2",
          pending > 0 || looksEmpty
            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            : "border-border bg-muted/40 text-muted-foreground"
        )}
      >
        {online ? (
          <Cloud className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-foreground">
            {businessName}
            {role ? ` · ${role}` : ""}
          </span>
          {cloudProductCount != null ? ` · ${cloudProductCount} cloud products` : ""}
          {cloudStatus ? ` · ${cloudStatus}` : ""}
          {" · "}
          {online
            ? pending > 0
              ? `${pending} sale(s) waiting to sync`
              : "Hybrid sync on (cloud + local)"
            : "Offline · local storage only"}
          {message ? ` · ${message}` : ""}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={busy || !online || switching}
          onClick={() => void runSync()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync now
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0"
          disabled={busy || !online || switching}
          onClick={() => void runReloadFromTeam()}
        >
          <Download className="h-3.5 w-3.5" />
          Reload from team
        </Button>
      </div>

      {saleProblems.length > 0 && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 space-y-2">
          <p className="font-semibold">
            {saleProblems.length} sale(s) could not upload to the team database
          </p>
          <ul className="list-disc pl-4 space-y-1">
            {saleProblems.slice(0, 3).map((p) => (
              <li key={p.id}>{p.lastError ?? p.status}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={busy || !online}
              onClick={() => void runSync()}
            >
              Retry upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              disabled={busy}
              onClick={() => {
                if (!businessId) return;
                if (
                  !window.confirm(
                    "Clear failed uploads from this device queue? The sales stay on this phone, but will not go to the shared team database."
                  )
                ) {
                  return;
                }
                void (async () => {
                  const n = await dismissFailedSaleSyncs(businessId);
                  await refreshCount();
                  toast({
                    title: "Cleared failed uploads",
                    description: `${n} sale(s) removed from sync queue`,
                  });
                })();
              }}
            >
              Dismiss failed
            </Button>
          </div>
        </div>
      )}

      {looksEmpty && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Wrong shop selected?</p>
          <p className="mt-1">
            This account is on <strong>{businessName}</strong> with 0 products, but
            another shop on this login has stock. Switch below, then tap{" "}
            <strong>Reload from team</strong>.
          </p>
        </div>
      )}

      {memberships.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active shop:</span>
          <select
            className="min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm"
            value={businessId ?? ""}
            disabled={switching || busy}
            onChange={(e) => onSwitchShop(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.businessId} value={m.businessId}>
                {m.businessName} · {m.role} · {m.productCount} products
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
