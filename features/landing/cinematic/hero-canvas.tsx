"use client";

import { useEffect, useRef } from "react";

/**
 * The chaos-to-control sequence, scrubbed by scroll.
 *
 * Drawn procedurally rather than played back from an image sequence. A 300
 * frame PNG scrub is roughly 45MB preloaded, which on this product's landing
 * page would be self-defeating — the pitch is that the software survives a bad
 * connection. This is about 8KB of code, stays sharp at any resolution, cannot
 * buffer, and scrubs identically in both directions.
 *
 * Phases across progress 0 → 1:
 *   0.00–0.22  scattered paper: receipts, invoices, tallies, all askew
 *   0.22–0.50  the pile lifts and drifts toward a grid
 *   0.50–0.72  panels settle into a dashboard; charts start drawing
 *   0.72–1.00  charts fill, links connect, the whole thing lights up
 */

type Slot = {
  /** Where it starts: the mess. Unit coords, -1..1 from centre. */
  cx: number;
  cy: number;
  crot: number;
  cw: number;
  ch: number;
  /** Where it ends: the dashboard grid. */
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  /** What it becomes. */
  kind: "bars" | "line" | "kpi" | "rows" | "donut";
  /** Staggers the settle so they don't all land at once. */
  delay: number;
};

const INK = "#050505";
const INDIGO = "#6366F1";
const EMERALD = "#10B981";

/** Deterministic scatter — a fixed layout reads as designed, not accidental. */
function buildSlots(): Slot[] {
  const grid: Omit<Slot, "cx" | "cy" | "crot" | "cw" | "ch" | "delay">[] = [
    { gx: -0.62, gy: -0.42, gw: 0.5, gh: 0.26, kind: "kpi" },
    { gx: -0.06, gy: -0.42, gw: 0.5, gh: 0.26, kind: "kpi" },
    { gx: 0.5, gy: -0.42, gw: 0.5, gh: 0.26, kind: "kpi" },
    { gx: -0.62, gy: -0.06, gw: 1.06, gh: 0.44, kind: "bars" },
    { gx: 0.5, gy: -0.06, gw: 0.5, gh: 0.44, kind: "donut" },
    { gx: -0.62, gy: 0.42, gw: 0.5, gh: 0.34, kind: "rows" },
    { gx: -0.06, gy: 0.42, gw: 1.06, gh: 0.34, kind: "line" },
  ];

  const scatter = [
    { cx: -0.72, cy: 0.34, crot: -0.38, cw: 0.34, ch: 0.46 },
    { cx: -0.3, cy: -0.5, crot: 0.29, cw: 0.3, ch: 0.4 },
    { cx: 0.44, cy: 0.5, crot: -0.22, cw: 0.28, ch: 0.42 },
    { cx: 0.66, cy: -0.34, crot: 0.41, cw: 0.32, ch: 0.44 },
    { cx: -0.08, cy: 0.16, crot: -0.14, cw: 0.36, ch: 0.48 },
    { cx: 0.14, cy: -0.62, crot: 0.5, cw: 0.26, ch: 0.36 },
    { cx: -0.52, cy: -0.12, crot: 0.18, cw: 0.3, ch: 0.42 },
  ];

  return grid.map((g, i) => ({
    ...g,
    ...scatter[i],
    delay: i * 0.045,
  }));
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Paper: the mess. Ruled lines and a torn feel, deliberately colourless. */
function drawPaper(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(232,232,238,0.92)";
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fill();

  ctx.strokeStyle = "rgba(90,90,110,0.5)";
  ctx.lineWidth = Math.max(1, h * 0.012);
  const lines = 6;
  for (let i = 1; i <= lines; i++) {
    const y = -h / 2 + (h / (lines + 1)) * i;
    const inset = w * (i % 3 === 0 ? 0.3 : 0.16);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + inset * 0.5, y);
    ctx.lineTo(w / 2 - inset, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPanelChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number,
  glow: number
) {
  ctx.globalAlpha = alpha;

  if (glow > 0) {
    ctx.shadowColor = `rgba(99,102,241,${0.5 * glow})`;
    ctx.shadowBlur = 34 * glow;
  }
  ctx.fillStyle = `rgba(18,18,26,${0.72 + 0.2 * glow})`;
  roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.09);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(120,124,180,${0.2 + 0.34 * glow})`;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const values = [0.42, 0.6, 0.36, 0.78, 0.54, 0.9, 0.66];
  const pad = w * 0.09;
  const inner = w - pad * 2;
  const bw = (inner / values.length) * 0.56;
  const gap = inner / values.length;
  const base = h / 2 - h * 0.16;

  values.forEach((v, i) => {
    const grow = clamp01((t - i * 0.05) * 1.7);
    const bh = (h * 0.58) * v * easeOut(grow);
    const x = -w / 2 + pad + gap * i + (gap - bw) / 2;
    const grad = ctx.createLinearGradient(0, base - bh, 0, base);
    grad.addColorStop(0, INDIGO);
    grad.addColorStop(1, "rgba(99,102,241,0.28)");
    ctx.fillStyle = grad;
    roundRect(ctx, x, base - bh, bw, bh, bw * 0.32);
    ctx.fill();
  });
}

function drawLine(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const pts = [0.32, 0.45, 0.38, 0.58, 0.52, 0.72, 0.68, 0.86];
  const pad = w * 0.08;
  const inner = w - pad * 2;
  const base = h / 2 - h * 0.14;
  const span = h * 0.56;
  const reveal = clamp01(t * 1.25);

  ctx.beginPath();
  pts.forEach((v, i) => {
    const p = i / (pts.length - 1);
    if (p > reveal) return;
    const x = -w / 2 + pad + inner * p;
    const y = base - span * v;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = EMERALD;
  ctx.lineWidth = Math.max(2, h * 0.028);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(16,185,129,0.55)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawKpi(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const pad = w * 0.1;
  ctx.fillStyle = "rgba(190,194,225,0.5)";
  roundRect(ctx, -w / 2 + pad, -h / 2 + h * 0.22, w * 0.36, h * 0.1, h * 0.05);
  ctx.fill();

  const barW = w * 0.52 * easeOut(clamp01(t * 1.4));
  const grad = ctx.createLinearGradient(-w / 2 + pad, 0, -w / 2 + pad + barW, 0);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "rgba(255,255,255,0.55)");
  ctx.fillStyle = grad;
  roundRect(ctx, -w / 2 + pad, -h / 2 + h * 0.46, barW, h * 0.2, h * 0.08);
  ctx.fill();
}

function drawRows(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rows = 4;
  const pad = w * 0.09;
  for (let i = 0; i < rows; i++) {
    const appear = clamp01((t - i * 0.12) * 2.2);
    if (appear <= 0) continue;
    const y = -h / 2 + h * 0.24 + (h * 0.58 * i) / rows;
    ctx.globalAlpha = appear;
    ctx.fillStyle = i === 0 ? EMERALD : "rgba(180,184,215,0.42)";
    roundRect(ctx, -w / 2 + pad, y, (w - pad * 2) * (0.9 - i * 0.13), h * 0.075, h * 0.04);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawDonut(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const r = Math.min(w, h) * 0.28;
  const sweep = easeOut(clamp01(t * 1.3)) * Math.PI * 1.62;
  ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = "rgba(120,124,180,0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = INDIGO;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(99,102,241,0.5)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function HeroCanvas({ progressRef }: { progressRef: React.RefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const slots = buildSlots();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let shown = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame() {
      const rect = canvas!.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      // Reduced motion gets the settled dashboard, never the churn.
      const target = reduced ? 1 : clamp01(progressRef.current ?? 0);
      // Smoothing stands in for a scroll-hijacking library: native scroll keeps
      // working, and the scrub still glides instead of stepping.
      shown += (target - shown) * 0.14;
      const p = reduced ? 1 : shown;

      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = INK;
      ctx!.fillRect(0, 0, W, H);

      const unit = Math.min(W, H) * 0.46;
      const cxo = W / 2;
      const cyo = H / 2;

      // Ambient wash that warms as order arrives.
      const wash = ctx!.createRadialGradient(cxo, cyo, 0, cxo, cyo, Math.max(W, H) * 0.7);
      wash.addColorStop(0, `rgba(99,102,241,${0.05 + 0.13 * p})`);
      wash.addColorStop(1, "rgba(5,5,5,0)");
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, W, H);

      // Connecting links, drawn under the panels once they have settled.
      if (p > 0.72) {
        const linkT = clamp01((p - 0.72) / 0.28);
        ctx!.globalAlpha = linkT * 0.5;
        ctx!.strokeStyle = INDIGO;
        ctx!.lineWidth = 1;
        for (let i = 0; i < slots.length - 1; i++) {
          const a = slots[i];
          const b = slots[i + 1];
          ctx!.beginPath();
          ctx!.moveTo(cxo + a.gx * unit + (a.gw * unit) / 2, cyo + a.gy * unit);
          ctx!.lineTo(cxo + b.gx * unit + (b.gw * unit) / 2, cyo + b.gy * unit);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      for (const s of slots) {
        // Each panel settles on its own clock so they don't land in unison.
        const local = easeOut(clamp01((p - s.delay) / (1 - s.delay) / 0.62));
        const x = cxo + lerp(s.cx, s.gx + s.gw / 2, local) * unit;
        const y = cyo + lerp(s.cy, s.gy, local) * unit;
        const w = lerp(s.cw, s.gw, local) * unit;
        const h = lerp(s.ch, s.gh, local) * unit;
        const rot = lerp(s.crot, 0, local);

        ctx!.save();
        ctx!.translate(x, y);
        ctx!.rotate(rot);

        if (local < 0.999) drawPaper(ctx!, w, h, 1 - local);
        if (local > 0.06) {
          drawPanelChrome(ctx!, w, h, local, clamp01((p - 0.6) / 0.4));
          const contentT = clamp01((local - 0.45) / 0.55);
          if (contentT > 0) {
            ctx!.save();
            if (s.kind === "bars") drawBars(ctx!, w, h, contentT);
            else if (s.kind === "line") drawLine(ctx!, w, h, contentT);
            else if (s.kind === "kpi") drawKpi(ctx!, w, h, contentT);
            else if (s.kind === "rows") drawRows(ctx!, w, h, contentT);
            else drawDonut(ctx!, w, h, contentT);
            ctx!.restore();
          }
        }

        ctx!.restore();
      }

      raf = window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [progressRef]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      // Decorative: the headline beside it carries the meaning.
      aria-hidden="true"
      role="presentation"
    />
  );
}
