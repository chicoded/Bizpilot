/**
 * Timeline for a device that assembles, plays, then comes apart.
 *
 * Each chapter gets its own 0..1 progress, and the whole life of the device
 * happens inside it:
 *
 *   0.00 ─ 0.20   pieces fly in and snap together
 *   0.18 ─ 0.30   screen powers on
 *   0.24 ─ 0.84   the workflow plays
 *   0.86 ─ 1.00   pieces separate and vanish
 *
 * Assembly overshoots very slightly before settling, which is what reads as a
 * click rather than a glide. Disassembly accelerates away instead, because
 * something falling apart should not decelerate into it.
 */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const range = (p: number, from: number, to: number) =>
  clamp01((p - from) / (to - from));

/** Overshoots past the target then settles — the snap. */
export function backOut(t: number, overshoot = 1.7) {
  const c = overshoot + 1;
  const u = t - 1;
  return 1 + c * u * u * u + overshoot * u * u;
}

/** Starts slow, accelerates — used for coming apart. */
export const easeInCubic = (t: number) => t * t * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Timeline = {
  /** 0 while scattered, 1 once assembled. */
  assemble: number;
  /** 0 until it starts coming apart, 1 once gone. */
  disassemble: number;
  /** Screen brightness as it powers on. */
  power: number;
  /** Progress of the workflow playing inside the screen. */
  play: number;
  /** Whole-device opacity. */
  presence: number;
  /** Brief flash at the moment the last piece lands. */
  flash: number;
};

export function timelineFor(p: number): Timeline {
  const assemble = backOut(range(p, 0, 0.2));
  const disassemble = easeInCubic(range(p, 0.86, 1));
  const power = range(p, 0.18, 0.3);
  const play = range(p, 0.24, 0.84);

  // Peaks as assembly completes, then fades — a single pulse, not a strobe.
  const landing = range(p, 0.14, 0.22);
  const flash = Math.sin(landing * Math.PI);

  return {
    assemble,
    disassemble,
    power,
    play,
    presence: clamp01(range(p, 0, 0.06)) * (1 - disassemble),
    flash,
  };
}

export type Piece = {
  /** Where this piece starts, relative to home, in px and degrees. */
  from: { x: number; y: number; z?: number; rx?: number; ry?: number; rz?: number };
  /** Where it flies off to when the device comes apart. */
  to?: { x: number; y: number; z?: number; rx?: number; ry?: number; rz?: number };
  /** Staggers this piece so they do not all land together. */
  delay?: number;
};

/**
 * Builds the CSS transform for one piece at a point in the timeline.
 *
 * Pieces are staggered on the way in so the device resolves edge by edge, and
 * staggered in reverse on the way out so it comes apart from the middle.
 */
export function pieceTransform(piece: Piece, t: Timeline): string {
  const delay = piece.delay ?? 0;
  const inT = clamp01((t.assemble - delay) / (1 - delay));
  const outT = t.disassemble;
  const to = piece.to ?? {
    x: -piece.from.x * 1.4,
    y: piece.from.y * 1.4,
    rz: (piece.from.rz ?? 0) * -1.5,
  };

  const x = lerp(piece.from.x, 0, inT) + lerp(0, to.x, outT);
  const y = lerp(piece.from.y, 0, inT) + lerp(0, to.y, outT);
  const z = lerp(piece.from.z ?? 0, 0, inT) + lerp(0, to.z ?? 0, outT);
  const rx = lerp(piece.from.rx ?? 0, 0, inT) + lerp(0, to.rx ?? 0, outT);
  const ry = lerp(piece.from.ry ?? 0, 0, inT) + lerp(0, to.ry ?? 0, outT);
  const rz = lerp(piece.from.rz ?? 0, 0, inT) + lerp(0, to.rz ?? 0, outT);

  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
}

export function pieceOpacity(piece: Piece, t: Timeline): number {
  const delay = piece.delay ?? 0;
  const inT = clamp01((t.assemble - delay) / (1 - delay));
  return clamp01(inT * 1.4) * (1 - t.disassemble);
}
