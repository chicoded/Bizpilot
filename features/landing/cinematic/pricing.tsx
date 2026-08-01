"use client";

import Link from "next/link";
import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/features/landing/reveal";
import { SUBSCRIPTION_PLANS } from "@/types";

/**
 * Prices come from SUBSCRIPTION_PLANS — the same list billing charges against.
 *
 * The brief asked for Starter / Growth / Enterprise. Those are not the plans
 * this product sells, and a price on a page that takes payment has to be the
 * price actually charged, so the real three are used instead.
 */
const RECOMMENDED = "BUSINESS";

export function Pricing() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
          Pricing
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Priced for a shop, not a corporation
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-white/55">
          Two weeks free, no card to start. Change plan or leave whenever you
          like.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan, index) => (
          <Reveal key={plan.id} delay={index * 80}>
            <TiltCard highlighted={plan.id === RECOMMENDED}>
              {plan.id === RECOMMENDED && (
                <p className="mb-4 inline-flex rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                  Most shops choose this
                </p>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="tnum text-4xl font-semibold text-white">
                  ₦{plan.price.toLocaleString("en-NG")}
                </span>
                <span className="text-sm text-white/45">/month</span>
              </p>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      aria-hidden
                    />
                    <span className="text-white/70">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={cn(
                  "mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
                  plan.id === RECOMMENDED
                    ? "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:ring-indigo-300"
                    : "border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] focus-visible:ring-white/60"
                )}
              >
                Start free trial
              </Link>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-white/40">
        Prices in naira, billed monthly through Paystack.
      </p>
    </section>
  );
}

/**
 * Tilts toward the pointer. Pointer-only by design: on a touch screen there is
 * no hover state to inhabit, and tilting on tap just makes the card feel loose.
 */
function TiltCard({
  children,
  highlighted,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-py * 5}deg) rotateY(${px * 5}deg) translateZ(0)`;
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn(
        "h-full rounded-2xl border p-6 backdrop-blur-md transition-transform duration-200 ease-out will-change-transform motion-reduce:transform-none",
        highlighted
          ? "border-indigo-400/40 bg-indigo-500/[0.07] shadow-[0_0_60px_-24px_rgba(99,102,241,0.9)]"
          : "border-white/10 bg-white/[0.035]"
      )}
    >
      {children}
    </div>
  );
}
