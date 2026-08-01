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
        {/* Lid, hinging open from behind */}
        <Fragment
          piece={{ from: { x: 0, y: -90, z: -200, rx: -55 } }}
          t={t}
          className="relative rounded-t-xl border border-b-0 border-slate-300 bg-slate-900 p-2 shadow-2xl dark:border-white/15"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white dark:bg-[#0d121b]">
            <div className="absolute inset-0" style={{ opacity: t.power }}>
              {children}
            </div>
            <PowerOn t={t} />
          </div>

          {/* Lid rails, closing in around the screen */}
          <Fragment
            piece={{ from: { x: 0, y: -80, rz: -8 }, delay: 0.14 }}
            t={t}
            className={cn(RAIL, "left-2 right-2 top-0 h-1 rounded-full")}
          />
          <Fragment
            piece={{ from: { x: -120, y: 0, ry: -40 }, delay: 0.2 }}
            t={t}
            className={cn(RAIL, "bottom-2 left-0 top-2 w-1 rounded-full")}
          />
          <Fragment
            piece={{ from: { x: 120, y: 0, ry: 40 }, delay: 0.2 }}
            t={t}
            className={cn(RAIL, "bottom-2 right-0 top-2 w-1 rounded-full")}
          />
          {/* Camera dot */}
          <Fragment
            piece={{ from: { x: 0, y: -50, z: 90 }, delay: 0.34 }}
            t={t}
            className="absolute left-1/2 top-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-600"
          />
        </Fragment>

        {/* Hinge, landing before the deck it joins */}
        <Fragment
          piece={{ from: { x: 0, y: 40, z: -90 }, delay: 0.08 }}
          t={t}
          className="relative mx-auto h-1 w-[92%] rounded-b bg-slate-950/60 dark:bg-black/50"
        />

        {/* Deck, arriving from below */}
        <Fragment
          piece={{ from: { x: 0, y: 130, rx: 50 }, delay: 0.12 }}
          t={t}
          className="relative h-6 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg dark:from-slate-700 dark:to-slate-900"
        >
          {/* Keyboard bed */}
          <Fragment
            piece={{ from: { x: -70, y: 40, rz: -14 }, delay: 0.3 }}
            t={t}
            className="absolute left-1/2 top-1 h-2 w-[62%] -translate-x-1/2 rounded-sm bg-slate-900/70"
          >
            <div className="flex h-full w-full items-center justify-evenly px-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="h-[3px] w-[3px] rounded-[1px] bg-white/25" />
              ))}
            </div>
          </Fragment>

          {/* Trackpad */}
          <Fragment
            piece={{ from: { x: 70, y: 46, rz: 16 }, delay: 0.38 }}
            t={t}
            className="absolute bottom-0.5 left-1/2 h-1.5 w-[22%] -translate-x-1/2 rounded-[2px] bg-slate-900/50 ring-1 ring-white/10"
          />

          {/* Ports, one each side */}
          <Fragment
            piece={{ from: { x: -100, y: 0, ry: -50 }, delay: 0.44 }}
            t={t}
            className="absolute left-1 top-2 h-1 w-2 rounded-sm bg-black/40"
          />
          <Fragment
            piece={{ from: { x: 100, y: 0, ry: 50 }, delay: 0.44 }}
            t={t}
            className="absolute right-1 top-2 h-1 w-2 rounded-sm bg-black/40"
          />
        </Fragment>

        {/* Shadow foot */}
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
