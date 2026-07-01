"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LAUNCH_QA_ITEMS,
  LAUNCH_QA_SECTIONS,
  getLaunchQaStorageKey,
  type LaunchQaItem,
} from "@/lib/launch-qa";
import { cn } from "@/lib/utils";

interface LaunchQaChecklistProps {
  businessId: string;
  appUrl: string;
}

export function LaunchQaChecklist({ businessId, appUrl }: LaunchQaChecklistProps) {
  const storageKey = getLaunchQaStorageKey(businessId);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [healthStatus, setHealthStatus] = useState<
    "idle" | "loading" | "healthy" | "unhealthy" | "error"
  >("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      setChecked(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  function toggle(item: LaunchQaItem) {
    persist({ ...checked, [item.id]: !checked[item.id] });
  }

  async function runHealthCheck() {
    setHealthStatus("loading");
    try {
      const res = await fetch("/api/health");
      const data = (await res.json()) as { status?: string };
      if (data.status === "healthy" && res.ok) {
        setHealthStatus("healthy");
        persist({ ...checked, "health-check": true });
      } else {
        setHealthStatus("unhealthy");
      }
    } catch {
      setHealthStatus("error");
    }
  }

  const completed = LAUNCH_QA_ITEMS.filter((item) => checked[item.id]).length;
  const criticalTotal = LAUNCH_QA_ITEMS.filter((item) => item.critical).length;
  const criticalDone = LAUNCH_QA_ITEMS.filter(
    (item) => item.critical && checked[item.id]
  ).length;
  const percent = Math.round((completed / LAUNCH_QA_ITEMS.length) * 100);

  if (!mounted) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pre-launch QA progress
              </p>
              <p className="text-2xl font-bold">
                {completed} of {LAUNCH_QA_ITEMS.length} checks
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Critical: {criticalDone}/{criticalTotal} complete
              </p>
            </div>
            {criticalDone === criticalTotal && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-3 py-1 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Ready for beta
              </span>
            )}
          </div>
          <Progress value={percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Progress is saved in this browser. Run checks on{" "}
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-biz-blue underline"
            >
              {appUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
        </CardContent>
      </Card>

      {LAUNCH_QA_SECTIONS.map((section) => {
        const items = LAUNCH_QA_ITEMS.filter((i) => i.section === section.id);
        const sectionDone = items.filter((i) => checked[i.id]).length;
        return (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>{section.title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {sectionDone}/{items.length}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {items.map((item) => {
                const done = Boolean(checked[item.id]);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                      done ? "border-success/30 bg-success/5" : "border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        {item.title}
                        {item.critical && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Critical
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.href && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={item.href}>Open</Link>
                          </Button>
                        )}
                        {item.id === "health-check" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={healthStatus === "loading"}
                            onClick={runHealthCheck}
                          >
                            {healthStatus === "loading" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Run health check"
                            )}
                          </Button>
                        )}
                        {item.id === "health-check" && healthStatus === "healthy" && (
                          <span className="text-xs text-success self-center">
                            Healthy
                          </span>
                        )}
                        {item.id === "health-check" &&
                          (healthStatus === "unhealthy" ||
                            healthStatus === "error") && (
                            <span className="text-xs text-destructive self-center flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Unhealthy
                            </span>
                          )}
                        {item.id === "sentry-monitoring" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              throw new Error("BizPilot Sentry test error");
                            }}
                          >
                            Send test error
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ExternalLink className="h-3.5 w-3.5" />
        Document bugs in a spreadsheet — fix data-loss and money issues first.
      </p>
    </div>
  );
}
