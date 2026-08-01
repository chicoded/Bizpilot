"use client";

import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  ScanLine,
  ReceiptText,
  Users,
  LineChart,
  Calculator,
  Wallet,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/features/landing/reveal";

/** Shared section heading, so spacing and rhythm stay identical throughout. */
function SectionHead({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-pretty leading-relaxed text-white/55">{body}</p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Section 2 — Chaos becomes control                                    */
/* ------------------------------------------------------------------ */

const MODULES = [
  { icon: Boxes, name: "Inventory", note: "Stock, batches, expiry" },
  { icon: ScanLine, name: "Point of sale", note: "Scan, sell, receipt" },
  { icon: ReceiptText, name: "Invoices", note: "Issued and settled" },
  { icon: Users, name: "Customers", note: "Debt and history" },
  { icon: LineChart, name: "Analytics", note: "Daily to yearly" },
  { icon: Calculator, name: "Accounting", note: "Cost and margin" },
  { icon: Wallet, name: "Payroll", note: "Staff and shifts" },
];

export function ChaosToControl() {
  return (
    <section id="tour" className="relative mx-auto max-w-6xl px-5 py-28">
      <SectionHead
        eyebrow="One system"
        title="Chaos becomes control"
        body="Seven jobs that used to live in seven notebooks. They share the same records, so a sale moves stock, settles a debt and lands in the accounts at once."
      />

      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module, index) => (
          <Reveal key={module.name} delay={(index % 3) * 70}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-md transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06] motion-reduce:hover:translate-y-0">
              <span
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl transition-opacity duration-500 group-hover:bg-indigo-500/20"
                aria-hidden
              />
              <module.icon className="h-6 w-6 text-indigo-300" aria-hidden />
              <h3 className="mt-4 font-semibold text-white">{module.name}</h3>
              <p className="mt-1 text-sm text-white/50">{module.note}</p>
            </div>
          </Reveal>
        ))}

        <Reveal delay={140}>
          <div className="flex h-full flex-col justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-6 backdrop-blur-md">
            <p className="text-sm font-semibold text-emerald-300">
              Connected, not merely bundled
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Seven apps that each hold their own copy of the truth is how the
              numbers stop agreeing by Friday.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — AI assistant                                             */
/* ------------------------------------------------------------------ */

const PROMPTS = [
  {
    q: "What products are selling fastest?",
    a: "Top movers this week, ranked by units and margin.",
    kind: "bars" as const,
  },
  {
    q: "Which customers haven't returned?",
    a: "14 regulars have not bought in 30 days.",
    kind: "dots" as const,
  },
  {
    q: "Predict next month's revenue.",
    a: "Trending 12% above last month on current pace.",
    kind: "curve" as const,
  },
];

export function AiAssistant() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (entry.isIntersecting) {
          timer = window.setInterval(
            () => setActive((i) => (i + 1) % PROMPTS.length),
            3400
          );
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  const current = PROMPTS[active];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.07] bg-white/[0.015]">
      <div ref={ref} className="mx-auto max-w-6xl px-5 py-28">
        <SectionHead
          eyebrow="Ask, don't dig"
          title="An assistant that reads your own books"
          body="Answers come from your records — the sales, stock and debts already on file — not from a general guess about businesses like yours."
        />

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
          {/* Sphere */}
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
            <span
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(99,102,241,0.55),rgba(5,5,5,0)_65%)] blur-xl"
              aria-hidden
            />
            <span
              className="absolute inset-6 animate-pulse rounded-full border border-indigo-400/25 motion-reduce:animate-none"
              aria-hidden
            />
            <span
              className="absolute inset-12 rounded-full border border-emerald-400/15"
              aria-hidden
            />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400/90 to-indigo-600/70 shadow-[0_0_60px_-10px_rgba(99,102,241,0.9)]">
              <Sparkles className="h-9 w-9 text-white" aria-hidden />
            </span>
          </div>

          {/* Conversation */}
          <div className="space-y-4">
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-white/45">You asked</p>
              <p className="mt-1.5 text-lg font-semibold text-white">
                {current.q}
              </p>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#0a0a0f] p-4">
                <MiniViz kind={current.kind} seed={active} />
                <p className="mt-3 text-sm text-white/60">{current.a}</p>
              </div>
            </div>

            <div className="flex gap-1.5" role="tablist" aria-label="Example questions">
              {/* The bar stays thin; the button around it is finger-sized.
                  A 6px tap target is decoration pretending to be a control. */}
              {PROMPTS.map((prompt, index) => (
                <button
                  key={prompt.q}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  aria-label={prompt.q}
                  onClick={() => setActive(index)}
                  className="flex h-11 items-center px-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] rounded"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      index === active ? "w-10 bg-indigo-400" : "w-4 bg-white/20"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Small inline chart. Re-keyed per question so the draw-in replays. */
function MiniViz({ kind, seed }: { kind: "bars" | "dots" | "curve"; seed: number }) {
  if (kind === "bars") {
    const values = [0.5, 0.78, 0.36, 0.92, 0.6];
    return (
      <div key={seed} className="flex h-24 items-end gap-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="flex-1 origin-bottom rounded-t bg-gradient-to-t from-indigo-500/30 to-indigo-400 motion-safe:animate-[grow_600ms_ease-out_both]"
            style={{ height: `${v * 100}%`, animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    );
  }

  if (kind === "dots") {
    return (
      <div key={seed} className="grid h-24 grid-cols-10 content-center gap-1.5">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-full motion-safe:animate-[fade_400ms_ease-out_both]",
              i % 7 === 0 ? "bg-emerald-400" : "bg-white/12"
            )}
            style={{ animationDelay: `${i * 14}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <svg key={seed} viewBox="0 0 200 96" className="h-24 w-full" aria-hidden>
      <path
        d="M4 78 L40 66 L76 70 L112 48 L148 34 L196 14"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="motion-safe:animate-[draw_900ms_ease-out_both]"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4 — Analytics                                                */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, active: boolean, ms = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);

  return value;
}

const STATS = [
  { label: "Recorded today", value: 486200, prefix: "₦" },
  { label: "Gross margin", value: 34, suffix: "%" },
  { label: "Items tracked", value: 1284 },
  { label: "Outstanding debt", value: 92400, prefix: "₦" },
];

export function Analytics() {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setLive(true),
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <SectionHead
        eyebrow="Analytics"
        title="The whole shop, at a glance"
        body="Not a wall of charts. The handful of numbers that decide what you do tomorrow morning."
      />

      <div ref={ref} className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 70}>
            <StatTile {...stat} live={live} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-semibold text-white">Revenue, last 12 weeks</p>
            <p className="text-sm text-emerald-300">Trending up</p>
          </div>
          <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-2.5">
            {[38, 44, 40, 52, 48, 61, 57, 68, 64, 79, 74, 91].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/25 to-indigo-400 transition-[height] duration-700 ease-out"
                style={{ height: live ? `${h}%` : "4%", transitionDelay: `${i * 45}ms` }}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function StatTile({
  label,
  value,
  prefix = "",
  suffix = "",
  live,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  live: boolean;
}) {
  const shown = useCountUp(value, live);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-md">
      <p className="text-sm text-white/45">{label}</p>
      <p className="tnum mt-2 text-2xl font-semibold text-white sm:text-3xl">
        {prefix}
        {shown.toLocaleString("en-NG")}
        {suffix}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section 6 — Automation                                               */
/* ------------------------------------------------------------------ */

const FLOW = [
  "Customer orders",
  "Stock comes down",
  "Invoice issued",
  "Payment confirmed",
  "Books updated",
  "Analytics refreshed",
  "Manager notified",
];

export function Automation() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.07] bg-white/[0.015]">
      <div className="mx-auto max-w-4xl px-5 py-28">
        <SectionHead
          eyebrow="Automation"
          title="One action, seven consequences"
          body="You ring up a sale. Everything downstream of it happens without anyone remembering to do it."
        />

        <ol className="mt-14 space-y-2.5">
          {FLOW.map((step, index) => (
            <Reveal key={step} delay={index * 70}>
              <li className="relative flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-md">
                <span className="tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-300">
                  {index + 1}
                </span>
                <span className="font-medium text-white">{step}</span>
                {index === FLOW.length - 1 && (
                  <Check className="ml-auto h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                            */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[36rem] bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.28),rgba(5,5,5,0)_68%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-5 py-32 text-center">
        <Reveal>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Your business deserves better software
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-pretty leading-relaxed text-white/55">
            Add your stock, ring up one sale, and see where the day stands. It
            takes about ten minutes, and nothing is charged for two weeks.
          </p>
          <a
            href="/sign-up"
            className="group mt-9 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-[#050505] transition-shadow hover:shadow-[0_0_44px_-6px_rgba(255,255,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            Start using Zaplex today
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
