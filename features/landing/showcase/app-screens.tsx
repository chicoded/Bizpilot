"use client";

import { Check, Search, Sparkles, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Zaplex workflow, drawn as real interface rather than played from a file.
 *
 * There is no screen recording in this repository, and a recording would be
 * the wrong medium anyway: a video of a phone screen is megabytes, blurs when
 * scaled, cannot be read by a screen reader, and goes stale the moment the app
 * changes. These are the actual components' shapes and typography, so they
 * stay sharp at any size, cost nothing to load, and can be scrubbed by scroll.
 *
 * Every screen takes progress 0..1 and animates against it, so the workflow
 * plays as the visitor scrolls rather than on a timer they cannot control.
 */

const step = (p: number, from: number, to: number) =>
  Math.max(0, Math.min(1, (p - from) / (to - from)));

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/* --------------------------- 1 · Scan a product --------------------------- */

const GRID = [
  { name: "Panadol Extra", price: 800 },
  { name: "Vitamin C 1000", price: 2400 },
  { name: "Ampiclox", price: 3200 },
  { name: "Cough syrup", price: 1500 },
  { name: "Multivite", price: 900 },
  { name: "Zincovit", price: 1200 },
];

export function ScanScreen({ p }: { p: number }) {
  const typing = step(p, 0.05, 0.4);
  const query = "panad".slice(0, Math.round(typing * 5));
  const matched = step(p, 0.4, 0.6);
  const added = step(p, 0.62, 0.85);

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-[#10151f] dark:text-slate-100">
      <div className="border-b border-slate-200 px-3 py-2.5 dark:border-white/10">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 dark:border-white/15 dark:bg-white/5">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">
            {query || "Scan or search"}
            {typing > 0 && typing < 1 && (
              <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-indigo-500 align-middle" />
            )}
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 content-start gap-1.5 p-2.5">
        {GRID.map((item, i) => {
          const isMatch = i === 0;
          const dim = matched > 0 && !isMatch ? 1 - matched * 0.75 : 1;
          return (
            <div
              key={item.name}
              className={cn(
                "rounded-lg border p-2 transition-all duration-300",
                isMatch && matched > 0.5
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                  : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
              )}
              style={{ opacity: dim, transform: `scale(${isMatch && matched > 0.5 ? 1.02 : 1})` }}
            >
              <p className="truncate text-[10px] font-semibold leading-tight">
                {item.name}
              </p>
              <p className="mt-1 text-[11px] font-bold tabular-nums">
                {naira(item.price)}
              </p>
            </div>
          );
        })}
      </div>

      {added > 0 && (
        <div
          className="mx-2.5 mb-2.5 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition-all duration-300"
          style={{ opacity: added, transform: `translateY(${(1 - ease(added)) * 12}px)` }}
        >
          <Check className="h-3.5 w-3.5" />
          Added to sale
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 2 · Take payment -------------------------- */

const CART = [
  { name: "Panadol Extra ×2", amount: 1600 },
  { name: "Vitamin C ×1", amount: 2400 },
  { name: "Ampiclox ×1", amount: 3200 },
];

export function PayScreen({ p, offline }: { p: number; offline?: boolean }) {
  const shown = CART.map((_, i) => step(p, 0.05 + i * 0.12, 0.28 + i * 0.12));
  const total = CART.reduce(
    (sum, item, i) => sum + item.amount * ease(shown[i]),
    0
  );
  const paying = step(p, 0.62, 0.9);

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-[#10151f] dark:text-slate-100">
      {offline && (
        <div className="flex items-center gap-1.5 bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-amber-950">
          <WifiOff className="h-3 w-3" />
          No network — saved on this phone
        </div>
      )}

      <div className="flex-1 space-y-1.5 p-2.5">
        {CART.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 transition-all duration-300 dark:border-white/10"
            style={{
              opacity: shown[i],
              transform: `translateY(${(1 - ease(shown[i])) * 10}px)`,
            }}
          >
            <span className="truncate text-[11px]">{item.name}</span>
            <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums">
              {naira(item.amount)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-2.5 dark:border-white/10">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Total
          </span>
          <span className="text-xl font-extrabold tabular-nums">{naira(total)}</span>
        </div>
        <div
          className={cn(
            "mt-2 flex h-9 items-center justify-center rounded-lg text-[12px] font-bold text-white transition-colors duration-300",
            paying > 0.5 ? "bg-emerald-600" : "bg-indigo-600"
          )}
        >
          {paying > 0.5 ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Paid · receipt ready
            </span>
          ) : (
            "Pay"
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- 3 · Dashboard updates ------------------------ */

const BARS = [38, 44, 40, 52, 48, 61, 57, 68, 64, 79, 74, 91];

export function DashboardScreen({ p }: { p: number }) {
  const grow = ease(step(p, 0.1, 0.75));
  const kpis = [
    { label: "Sales today", value: 124500 * grow },
    { label: "Profit", value: 31600 * grow },
    { label: "Expenses", value: 38200 * grow },
    { label: "Owed to you", value: 52000 * grow },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-[#0d121b] dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
        <span className="text-[11px] font-bold">Dashboard</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Live
        </span>
      </div>

      <div className="grid grid-cols-4 gap-px bg-slate-200 dark:bg-white/10">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 p-2.5 dark:bg-[#0d121b]">
            <p className="truncate text-[9px] text-slate-500">{kpi.label}</p>
            <p className="mt-0.5 text-[12px] font-bold tabular-nums">
              {naira(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Revenue, last 12 weeks
        </p>
        <div className="mt-2 flex flex-1 items-end gap-1">
          {BARS.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/40 to-indigo-500"
              style={{ height: `${4 + (h - 4) * ease(step(p, 0.15 + i * 0.03, 0.5 + i * 0.03))}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- 4 · Ask the AI --------------------------- */

const QUESTION = "What should I reorder this week?";

export function AiScreen({ p }: { p: number }) {
  const typed = step(p, 0.05, 0.42);
  const text = QUESTION.slice(0, Math.round(typed * QUESTION.length));
  const answering = step(p, 0.46, 0.6);
  const rows = [
    { name: "Panadol Extra", left: "3 left", urgency: "text-red-600 dark:text-red-400" },
    { name: "Vitamin C 1000", left: "5 left", urgency: "text-amber-600 dark:text-amber-400" },
    { name: "Cough syrup", left: "6 left", urgency: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-[#0d121b] dark:text-slate-100">
      <div className="border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          Zaplex assistant
        </span>
      </div>

      <div className="flex-1 space-y-2.5 p-3">
        <div className="ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm bg-indigo-600 px-3 py-2 text-[11px] text-white">
          {text || " "}
          {typed > 0 && typed < 1 && (
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-white align-middle" />
          )}
        </div>

        {answering > 0 && (
          <div
            className="w-fit max-w-[92%] rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 transition-all duration-500 dark:border-white/10 dark:bg-white/[0.04]"
            style={{
              opacity: answering,
              transform: `translateY(${(1 - ease(answering)) * 8}px)`,
            }}
          >
            <p className="text-[11px] font-semibold">
              Three lines are at or below reorder level:
            </p>
            <div className="mt-2 space-y-1">
              {rows.map((row, i) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-3 transition-opacity duration-300"
                  style={{ opacity: step(p, 0.6 + i * 0.08, 0.74 + i * 0.08) }}
                >
                  <span className="text-[10px]">{row.name}</span>
                  <span className={cn("text-[10px] font-bold tabular-nums", row.urgency)}>
                    {row.left}
                  </span>
                </div>
              ))}
            </div>
            <p
              className="mt-2 border-t border-slate-200 pt-1.5 text-[9px] text-slate-500 transition-opacity duration-300 dark:border-white/10"
              style={{ opacity: step(p, 0.82, 0.95) }}
            >
              Read from your stock levels just now
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
