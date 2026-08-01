"use client";

import { cn } from "@/lib/utils";
import { ZaplexMark } from "@/components/brand/zaplex-mark";
import { deviceTransform, timelineFor, type Timeline } from "./motion";

/**
 * Device chrome as a two-sided card.
 *
 * The device turns on its Y axis: it arrives showing its back, rotates round to
 * face the viewer, plays its workflow, then turns away again. Both faces are
 * real elements with backface-visibility hidden, so the back panel is genuinely
 * behind the screen rather than the screen being mirrored.
 *
 * Deliberately generic hardware — a phone and a laptop, not anyone's phone and
 * laptop. Photorealistic Apple hardware on a commercial page is trade dress
 * Apple enforces, and Zaplex would be the one holding that risk.
 */

const FACE = "absolute inset-0 [backface-visibility:hidden]";

/** The glow that sweeps the screen as it powers on. */
function PowerOn({ t }: { t: Timeline }) {
  if (t.power >= 1 || t.power <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background: `linear-gradient(180deg, transparent ${t.power * 100 - 18}%, rgba(255,255,255,0.5) ${t.power * 100}%, transparent ${t.power * 100 + 18}%)`,
      }}
    />
  );
}

export function PhoneFrame({
  progress,
  children,
  className,
  swapAt,
}: {
  /** Progress across the whole tour, 0..1. */
  progress: number;
  children: React.ReactNode;
  className?: string;
  /** Where the device changes, so the handover can dissolve. */
  swapAt?: number;
}) {
  const t = timelineFor(progress, swapAt);

  return (
    <div
      className={cn("relative mx-auto w-[min(15rem,72vw)] shrink-0", className)}
      style={{ perspective: "1600px", opacity: t.presence }}
    >
      <div
        className="relative aspect-[9/17]"
        style={{
          transformStyle: "preserve-3d",
          transform: deviceTransform(t),
          willChange: "transform",
        }}
      >
        {/* Front: the screen */}
        <div
          className={cn(
            FACE,
            "rounded-[2rem] border border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15"
          )}
        >
          <div className="relative h-full overflow-hidden rounded-[1.6rem] bg-white dark:bg-[#10151f]">
            <span className="absolute left-1/2 top-2 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-black/15 dark:bg-white/25" />
            <div className="absolute inset-0 pt-5" style={{ opacity: t.power }}>
              {children}
            </div>
            <PowerOn t={t} />
          </div>
        </div>

        {/* Back: what you see before it turns */}
        <div
          className={cn(
            FACE,
            "flex flex-col items-center justify-between rounded-[2rem] border border-slate-300 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl dark:border-white/15"
          )}
          style={{ transform: "rotateY(180deg)" }}
          aria-hidden
        >
          {/* Camera island */}
          <div className="self-start rounded-xl bg-black/40 p-1.5 ring-1 ring-white/10">
            <div className="grid grid-cols-2 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full bg-slate-950 ring-1 ring-white/15"
                />
              ))}
            </div>
          </div>
          <ZaplexMark className="h-9 w-9 opacity-70" title={null} />
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/25">
            Zaplex
          </span>
        </div>
      </div>
    </div>
  );
}

export function LaptopFrame({
  progress,
  children,
  className,
  swapAt,
}: {
  progress: number;
  children: React.ReactNode;
  className?: string;
  swapAt?: number;
}) {
  const t = timelineFor(progress, swapAt);

  return (
    <div
      className={cn("mx-auto w-[min(34rem,92vw)] shrink-0", className)}
      style={{ perspective: "1800px", opacity: t.presence }}
    >
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transform: deviceTransform(t),
          willChange: "transform",
        }}
      >
        {/* Front: lid, screen, deck */}
        <div className="[backface-visibility:hidden]">
          <div className="rounded-t-xl border border-b-0 border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white dark:bg-[#0d121b]">
              <div className="absolute inset-0" style={{ opacity: t.power }}>
                {children}
              </div>
              <PowerOn t={t} />
            </div>
          </div>
          <div className="relative h-3 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg dark:from-slate-700 dark:to-slate-900">
            <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-black/30" />
          </div>
          <div className="mx-auto h-1 w-[85%] rounded-b-lg bg-slate-800/50 dark:bg-black/40" />
        </div>

        {/* Back: the closed lid */}
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
          aria-hidden
        >
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-300 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl dark:border-white/15">
            <ZaplexMark className="h-10 w-10 opacity-70" title={null} />
          </div>
        </div>
      </div>
    </div>
  );
}
