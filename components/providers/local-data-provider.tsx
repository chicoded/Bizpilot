"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { hydrateLocalStoreFromServer } from "@/lib/local-data/hydrate";
import { getActiveBusinessId, getLocalBusinessMeta } from "@/lib/local-data/business";
import { runScheduledBackup } from "@/lib/backup/scheduler";
import { handleGmailOAuthRedirect } from "@/lib/backup/gmail";

type LocalDataStatus = "loading" | "ready" | "error";

type LocalDataContextValue = {
  status: LocalDataStatus;
  businessId: string | null;
  businessName: string;
  currency: string;
  storageMode: "local";
  refresh: () => Promise<void>;
  runBackupNow: () => Promise<{ ok: boolean; message: string }>;
};

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

function applyMeta(
  meta: Awaited<ReturnType<typeof getLocalBusinessMeta>>,
  setBusinessId: (id: string | null) => void,
  setBusinessName: (name: string) => void,
  setCurrency: (currency: string) => void
) {
  const id = meta?.businessId ?? null;
  setBusinessId(id);
  setBusinessName(meta?.name ?? "My shop");
  setCurrency(meta?.currency ?? "NGN");
  return id;
}

function isAuthOnlyPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/internal")
  );
}

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [status, setStatus] = useState<LocalDataStatus>("loading");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("My shop");
  const [currency, setCurrency] = useState("NGN");
  const statusRef = useRef<LocalDataStatus>("loading");
  const hydratedSessionRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async (options?: { quiet?: boolean }) => {
    // Never blank the whole app after the first ready paint (stops nav blink).
    const quiet =
      options?.quiet === true || statusRef.current === "ready";
    if (!quiet) {
      setStatus("loading");
    }

    try {
      handleGmailOAuthRedirect();

      const existingMeta = await getLocalBusinessMeta();
      const existingId =
        existingMeta?.businessId ?? (await getActiveBusinessId());
      if (existingId) {
        applyMeta(
          existingMeta ?? {
            businessId: existingId,
            name: "My shop",
            currency: "NGN",
            updatedAt: new Date().toISOString(),
          },
          setBusinessId,
          setBusinessName,
          setCurrency
        );
        setStatus("ready");
      }

      await hydrateLocalStoreFromServer();
      const meta = await getLocalBusinessMeta();
      const id = meta?.businessId ?? (await getActiveBusinessId());
      if (id) {
        applyMeta(
          meta ?? {
            businessId: id,
            name: "My shop",
            currency: "NGN",
            updatedAt: new Date().toISOString(),
          },
          setBusinessId,
          setBusinessName,
          setCurrency
        );
      }
      setStatus("ready");
    } catch {
      const meta = await getLocalBusinessMeta();
      const id = meta?.businessId ?? (await getActiveBusinessId());
      if (id) {
        applyMeta(
          meta ?? {
            businessId: id,
            name: "My shop",
            currency: "NGN",
            updatedAt: new Date().toISOString(),
          },
          setBusinessId,
          setBusinessName,
          setCurrency
        );
      }
      setStatus("ready");
    }
  }, []);

  const runBackupNow = useCallback(async () => {
    const id = businessId ?? (await getActiveBusinessId());
    if (!id) {
      return { ok: false, message: "No shop data found on this device yet." };
    }
    return runScheduledBackup(id, { force: true });
  }, [businessId]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      hydratedSessionRef.current = false;
      setStatus("ready");
      return;
    }

    if (isAuthOnlyPath(pathname)) {
      setStatus("ready");
      return;
    }

    // Hydrate once per signed-in session — not on every page navigation.
    if (hydratedSessionRef.current) return;
    hydratedSessionRef.current = true;
    void refresh();
  }, [isLoaded, isSignedIn, pathname, refresh]);

  useEffect(() => {
    if (!businessId || status !== "ready") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    let cancelled = false;

    async function runTeamSync() {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const { pingCloudDatabase, isCloudUsable } = await import(
        "@/lib/sync/cloud-status"
      );
      const cloud = await pingCloudDatabase({ wake: true });
      if (!isCloudUsable(cloud.status) || cancelled) return;

      const { syncTeamData } = await import("@/lib/sync/sales-sync");
      await syncTeamData(businessId!);
    }

    void runTeamSync();
    const interval = window.setInterval(() => void runTeamSync(), 25_000);

    function onVisible() {
      if (document.visibilityState === "visible") void runTeamSync();
    }
    function onOnline() {
      void runTeamSync();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [businessId, status]);

  useEffect(() => {
    if (!businessId || status !== "ready") return;

    const checkBackup = () => {
      void runScheduledBackup(businessId);
    };

    checkBackup();
    const interval = window.setInterval(checkBackup, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [businessId, status]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "bizpilot:gmail-connected") {
        void refresh({ quiet: true });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      businessId,
      businessName,
      currency,
      storageMode: "local" as const,
      refresh: () => refresh({ quiet: true }),
      runBackupNow,
    }),
    [status, businessId, businessName, currency, refresh, runBackupNow]
  );

  return (
    <LocalDataContext.Provider value={value}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (!context) {
    throw new Error("useLocalData must be used within LocalDataProvider");
  }
  return context;
}
