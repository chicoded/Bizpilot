"use client";

import { cn } from "@/lib/utils";
import {
  pieceOpacity,
  pieceTransform,
  timelineFor,
  type Piece,
  type Timeline,
} from "./assembly";

/**
 * Device chrome built from separate pieces, so it can assemble and come apart.
 *
 * The frame is not one rounded box with a screen inside — it is rails, a
 * screen, a speaker slot, a camera and a button, each flying in from its own
 * direction and snapping into place. That is what makes the assembly read as
 * something being put together rather than a box fading in.
 *
 * Deliberately generic hardware — a phone and a laptop, not anyone's phone and
 * laptop. Photorealistic Apple hardware on a commercial page is trade dress
 * Apple enforces, and Zaplex would be the one holding that risk.
 */

const RAIL = "absolute bg-slate-800 dark:bg-slate-700";

function Fragment({
  piece,
  t,
  className,
  style,
  children,
}: {
  piece: Piece;
  t: Timeline;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        ...style,
        transform: pieceTransform(piece, t),
        opacity: pieceOpacity(piece, t),
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

/** The glow that sweeps the screen as it powers on. */
function PowerOn({ t }: { t: Timeline }) {
  if (t.power >= 1 || t.power <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background: `linear-gradient(180deg, transparent ${t.power * 100 - 18}%, rgba(255,255,255,0.55) ${t.power * 100}%, transparent ${t.power * 100 + 18}%)`,
      }}
    />
  );
}

export function PhoneFrame({
  progress,
  children,
  className,
}: {
  /** Chapter progress, 0..1. */
  progress: number;
  children: React.ReactNode;
  className?: string;
}) {
  const t = timelineFor(progress);

  return (
    <div
      className={cn("relative mx-auto w-[min(15rem,72vw)] shrink-0", className)}
      style={{ perspective: "1400px", opacity: t.presence }}
    >
      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        {/* Body */}
        <Fragment
          piece={{ from: { x: 0, y: 40, z: -160, rx: 22 } }}
          t={t}
          className="rounded-[2rem] border border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15"
        >
          <div className="relative aspect-[9/17] overflow-hidden rounded-[1.6rem] bg-white dark:bg-[#10151f]">
            {/* The workflow only appears once the shell has landed. */}
            <div
              className="absolute inset-0 pt-4"
              style={{ opacity: t.power }}
            >
              {children}
            </div>
            <PowerOn t={t} />
          </div>
        </Fragment>

        {/* Rails, each arriving from its own edge */}
        <Fragment
          piece={{ from: { x: 0, y: -120, rz: -10 }, delay: 0.05 }}
          t={t}
          className={cn(RAIL, "left-3 right-3 top-0 h-1.5 rounded-full")}
        />
        <Fragment
          piece={{ from: { x: 0, y: 120, rz: 10 }, delay: 0.05 }}
          t={t}
          className={cn(RAIL, "bottom-0 left-3 right-3 h-1.5 rounded-full")}
        />
        <Fragment
          piece={{ from: { x: -140, y: 0, ry: -35 }, delay: 0.1 }}
          t={t}
          className={cn(RAIL, "bottom-6 left-0 top-6 w-1.5 rounded-full")}
        />
        <Fragment
          piece={{ from: { x: 140, y: 0, ry: 35 }, delay: 0.1 }}
          t={t}
          className={cn(RAIL, "bottom-6 right-0 top-6 w-1.5 rounded-full")}
        />

        {/* Speaker slot */}
        <Fragment
          piece={{ from: { x: 0, y: -70, z: 120 }, delay: 0.22 }}
          t={t}
          className="absolute left-1/2 top-3 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-white/25"
        />

        {/* Side button */}
        <Fragment
          piece={{ from: { x: 90, y: -30, rz: 40 }, delay: 0.3 }}
          t={t}
          className="absolute -right-0.5 top-16 h-8 w-1 rounded-r bg-slate-700 dark:bg-slate-600"
        />

        {/* Landing flash */}
        {t.flash > 0.01 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[2rem]"
            style={{
              boxShadow: `0 0 ${28 * t.flash}px ${6 * t.flash}px rgba(99,102,241,${0.55 * t.flash})`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function LaptopFrame({
  progress,
  children,
  className,
}: {
  progress: number;
  children: React.ReactNode;
  className?: string;
}) {
  const t = timelineFor(progress);

  return (
    <div
      className={cn("mx-auto w-[min(34rem,92vw)] shrink-0", className)}
      style={{ perspective: "1600px", opacity: t.presence }}
    >
      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        {/* Lid */}
        <Fragment
          piece={{ from: { x: 0, y: -90, z: -200, rx: -45 } }}
          t={t}
          className="rounded-t-xl border border-b-0 border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white dark:bg-[#0d121b]">
            <div className="absolute inset-0" style={{ opacity: t.power }}>
              {children}
            </div>
            <PowerOn t={t} />
          </div>
        </Fragment>

        {/* Deck, arriving from below */}
        <Fragment
          piece={{ from: { x: 0, y: 110, rx: 40 }, delay: 0.12 }}
          t={t}
          className="relative h-3 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg dark:from-slate-700 dark:to-slate-900"
        >
          {/* Hinge notch */}
          <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-black/30" />
        </Fragment>

        {/* Foot */}
        <Fragment
          piece={{ from: { x: -60, y: 70, rz: -12 }, delay: 0.26 }}
          t={t}
          className="mx-auto h-1 w-[85%] rounded-b-lg bg-slate-800/50 dark:bg-black/40"
        />

        {t.flash > 0.01 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow: `0 0 ${34 * t.flash}px ${8 * t.flash}px rgba(99,102,241,${0.5 * t.flash})`,
            }}
          />
        )}
      </div>
    </div>
  );
}
