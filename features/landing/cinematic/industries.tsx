"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/features/landing/reveal";

/**
 * Only trades the app actually has a setup for.
 *
 * The brief also listed Warehouse and Salon; neither exists in the Industry
 * enum, so neither is advertised here. Naming a trade on the pricing path that
 * the product cannot configure is the same problem as quoting a price it does
 * not charge.
 */
const TRADES = [
  {
    id: "PHARMACY",
    label: "Pharmacy",
    line: "NAFDAC numbers, batch and expiry, prescription-only flags.",
    metrics: [
      { k: "Expiring in 30 days", v: "12 items" },
      { k: "Controlled stock", v: "Logged" },
      { k: "Today", v: "₦184,300" },
    ],
  },
  {
    id: "RESTAURANT",
    label: "Restaurant",
    line: "Combos, plate builder, kitchen screen, rush-hour mode.",
    metrics: [
      { k: "Open tickets", v: "7" },
      { k: "Avg. serve time", v: "6 min" },
      { k: "Today", v: "₦241,900" },
    ],
  },
  {
    id: "SUPERMARKET",
    label: "Supermarket",
    line: "Barcode-first checkout, reorder levels, supplier orders.",
    metrics: [
      { k: "Lines scanned", v: "1,412" },
      { k: "Below reorder", v: "23" },
      { k: "Today", v: "₦612,050" },
    ],
  },
  {
    id: "FASHION",
    label: "Fashion",
    line: "Size, colour and material on every item; season tracking.",
    metrics: [
      { k: "Dead stock", v: "18 items" },
      { k: "Best seller", v: "Ankara set" },
      { k: "Today", v: "₦96,400" },
    ],
  },
  {
    id: "ELECTRONICS",
    label: "Electronics",
    line: "Serial numbers, warranty months, scan-first till.",
    metrics: [
      { k: "Under warranty", v: "146" },
      { k: "Avg. margin", v: "22%" },
      { k: "Today", v: "₦438,700" },
    ],
  },
  {
    id: "MINI_MART",
    label: "Mini mart",
    line: "Fast counter, credit book, daily close in one screen.",
    metrics: [
      { k: "Customers owing", v: "9" },
      { k: "Debt out", v: "₦52,000" },
      { k: "Today", v: "₦74,800" },
    ],
  },
  {
    id: "CAFE",
    label: "Cafe",
    line: "Quick menu, combos, takeaway and dine-in split.",
    metrics: [
      { k: "Cups today", v: "212" },
      { k: "Peak hour", v: "8–9am" },
      { k: "Today", v: "₦58,200" },
    ],
  },
  {
    id: "COSMETICS",
    label: "Cosmetics",
    line: "Shelf categories, expiry alerts, repeat-customer history.",
    metrics: [
      { k: "Repeat buyers", v: "38%" },
      { k: "Expiring soon", v: "6 items" },
      { k: "Today", v: "₦112,600" },
    ],
  },
] as const;

export function Industries() {
  const [active, setActive] = useState(0);
  const trade = TRADES[active];

  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
          Industries
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          A chemist and a rice shop do not run the same way
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-white/55">
          So they do not get the same app. Pick a trade to see what changes.
        </p>
      </Reveal>

      <div
        className="mt-12 flex flex-wrap justify-center gap-2"
        role="tablist"
        aria-label="Choose a trade"
      >
        {TRADES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls="trade-panel"
            onClick={() => setActive(index)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
              index === active
                ? "border-indigo-400/60 bg-indigo-500/15 text-white"
                : "border-white/12 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id="trade-panel"
        role="tabpanel"
        aria-live="polite"
        className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md"
      >
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-3">
          {trade.metrics.map((metric) => (
            <div key={metric.k} className="bg-[#08080c] p-5">
              <p className="text-sm text-white/45">{metric.k}</p>
              <p className="tnum mt-1.5 text-xl font-semibold text-white">
                {metric.v}
              </p>
            </div>
          ))}
        </div>
        <div className="p-6">
          <p className="text-sm font-semibold text-indigo-300">{trade.label}</p>
          <p className="mt-1.5 text-pretty text-white/70">{trade.line}</p>
        </div>
      </div>
    </section>
  );
}
