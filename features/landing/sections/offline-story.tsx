"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cloud, CloudOff, Loader2, Signal, SignalZero } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one claim worth animating: the till keeps working when the signal goes.
 *
 * Built from DOM and CSS rather than a video. The audience is on metered
 * mobile data, often 3G — shipping megabytes of footage to explain that the
 * app tolerates a bad connection would undercut the point it is making. This
 * costs a few kilobytes and cannot buffer.
 */

type Phase = "online" | "dropped" | "selling" | "restored";

const SALES = [
  { item: "Panadol Extra ×2", amount: "₦1,600" },
  { item: "Vitamin C ×1", amount: "₦2,400" },
  { item: "Ampiclox ×1", amount: "₦3,200" },
];

/** Roughly how long each beat holds before the next one starts, in ms. */
const TIMELINE: { phase: Phase; hold: number }[] = [
  { phase: "online", hold: 1100 },
  { phase: "dropped", hold: 1400 },
  { phase: "selling", hold: 2600 },
  { phase: "restored", hold: 3200 },
];

export function OfflineStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Start only once the graphic is actually on screen.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(TIMELINE.length - 1);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPlaying(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Advance through the beats, then hold on the last one.
  useEffect(() => {
    if (!playing || step >= TIMELINE.length - 1) return;
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      TIMELINE[step].hold
    );
    return () => window.clearTimeout(timer);
  }, [playing, step]);

  const phase = TIMELINE[step].phase;
  const offline = phase === "dropped" || phase === "selling";
  const visibleSales = phase === "online" ? 1 : phase === "dropped" ? 1 : 3;
  const queued = phase === "selling" ? 2 : phase === "dropped" ? 0 : 0;

  const caption =
    phase === "online"
      ? "Ringing up a sale, network fine."
      : phase === "dropped"
        ? "Network drops mid-queue. Nothing stops."
        : phase === "selling"
          ? "Sales keep recording on the phone itself."
          : "Signal returns — everything syncs on its own.";

  return (
    <div ref={ref} className="grid items-center gap-10 md:grid-cols-2">
      {/* Device */}
      <div className="mx-auto w-full max-w-[19rem]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-glass">
          {/* Status bar */}
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors duration-500",
              offline
                ? "bg-warning text-warning-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              {offline ? (
                <SignalZero className="h-3.5 w-3.5" />
              ) : (
                <Signal className="h-3.5 w-3.5" />
              )}
              {offline ? "No network" : "Online"}
            </span>
            <span className="tnum">9:41</span>
          </div>

          {/* Sales */}
          <div className="space-y-2 p-4">
            {SALES.map((sale, index) => (
              <div
                key={sale.item}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-all duration-500",
                  index < visibleSales
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                )}
                style={{ transitionDelay: `${index * 160}ms` }}
              >
                <span className="text-foreground">{sale.item}</span>
                <span className="tnum font-semibold text-foreground">
                  {sale.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Sync footer */}
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs font-medium">
            {phase === "restored" ? (
              <>
                <Check className="h-4 w-4 shrink-0 text-success" />
                <span className="text-success">3 sales synced to your team</span>
              </>
            ) : offline ? (
              <>
                <CloudOff className="h-4 w-4 shrink-0 text-warning" />
                <span className="text-muted-foreground">
                  Saved on this phone
                  {queued > 0 ? ` · ${queued} waiting to sync` : ""}
                </span>
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Synced</span>
              </>
            )}
          </div>
        </div>

        {/* Beat indicator */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {TIMELINE.map((beat, index) => (
            <span
              key={beat.phase}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                index === step ? "w-6 bg-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {/* Copy */}
      <div>
        <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          The queue does not wait for your network
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Most shop software stops the moment the signal does, and the customer
          in front of you does not care why. Zaplex records the sale on the
          phone first and settles up with the cloud afterwards.
        </p>

        <p
          aria-live="polite"
          className="mt-6 flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-foreground"
        >
          {phase === "restored" ? (
            <Check className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <Loader2
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground",
                playing && "animate-spin motion-reduce:animate-none"
              )}
            />
          )}
          {caption}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Two devices selling the last unit at once is handled too — one wins,
          and the other is told before the stock goes negative.
        </p>
      </div>
    </div>
  );
}
