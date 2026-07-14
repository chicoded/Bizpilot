"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocalDataStatus>("loading");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("My shop");
  const [currency, setCurrency] = useState("NGN");

  const refresh = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) {
      setStatus("loading");
    }

    try {
      handleGmailOAuthRedirect();

      // Warm path: if this device already has shop data, become ready immediately.
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
        setStatus("ready");
        return;
      }

      if (!existingId) {
        setStatus("error");
      }
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
        setStatus("ready");
      } else {
        setStatus("error");
      }
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
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!businessId || status !== "ready") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    void (async () => {
      const { flushSaleSyncQueue, pullCloudProducts } = await import(
        "@/lib/sync/sales-sync"
      );
      await flushSaleSyncQueue(businessId);
      await pullCloudProducts(businessId);
    })();
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
      refresh: () => refresh(),
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
