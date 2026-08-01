"use client";

import { cn } from "@/lib/utils";

/**
 * Device chrome, drawn in CSS.
 *
 * Deliberately generic — a phone and a laptop, not anyone's phone and laptop.
 * Photorealistic Apple hardware on a commercial page is trade dress Apple
 * enforces, and it would be Zaplex holding that risk.
 */

export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[min(15rem,72vw)] shrink-0 rounded-[2rem] border border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15",
        className
      )}
    >
      {/* Speaker slot rather than a notch cut-out: reads as a phone without
          imitating a specific handset. */}
      <div className="absolute left-1/2 top-3 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-white/25" />
      <div className="relative aspect-[9/17] overflow-hidden rounded-[1.6rem] bg-white dark:bg-[#10151f]">
        <div className="absolute inset-0 pt-4">{children}</div>
      </div>
    </div>
  );
}

export function LaptopFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-[min(34rem,92vw)] shrink-0", className)}>
      <div className="rounded-t-xl border border-b-0 border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white dark:bg-[#0d121b]">
          {children}
        </div>
      </div>
      {/* Base and hinge */}
      <div className="relative h-3 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg dark:from-slate-700 dark:to-slate-900">
        <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-black/30" />
      </div>
      <div className="mx-auto h-1 w-[85%] rounded-b-lg bg-slate-800/50 dark:bg-black/40" />
    </div>
  );
}
