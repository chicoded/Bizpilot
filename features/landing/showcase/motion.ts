/**
 * Motion for the product tour.
 *
 * The device turns exactly twice across the whole tour: once to face you at the
 * start, once to turn away at the end. In between it stays square while the
 * screen changes from feature to feature — spinning on every chapter made the
 * turn a tic rather than an entrance.
 *
 * Progress here is the whole tour, 0..1, not one chapter.
 *
 *   0.00 ─ 0.05   turns from its back round to the front
 *   0.04 ─ 0.09   screen powers on
 *   0.09 ─ 0.95   features play, device square to the viewer
 *   0.95 ─ 1.00   turns away again
 */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const range = (p: number, from: number, to: number) =>
  clamp01((p - from) / (to - from));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far round the device starts and ends, in degrees. */
const FACING_AWAY = 180;

export type Timeline = {
  /** Y rotation in degrees. 0 is square to the viewer. */
  angle: number;
  /** True while the back of the device is the side facing us. */
  showingBack: boolean;
  /** Screen brightness as it powers on. */
  power: number;
  /** Whole-device opacity, including the dip when the device itself changes. */
  presence: number;
  /** Pushed back into the scene mid-turn, so the spin has depth. */
  depth: number;
};

/**
 * A short dissolve where the phone gives way to the laptop.
 *
 * Changing device is a real change and needs marking, but not with another
 * spin — the brief is two turns for the whole tour. A dip to near-nothing and
 * back reads as a handover without competing with the entrance.
 */
function swapDip(p: number, at: number, halfWidth = 0.022) {
  const d = Math.abs(p - at);
  if (d >= halfWidth) return 1;
  // Cosine bell: 1 at the edges, ~0.12 dead centre.
  return 0.12 + 0.88 * (1 - Math.cos((d / halfWidth) * Math.PI)) / 2;
}

export function timelineFor(p: number, swapAt?: number): Timeline {
  const spinIn = easeOutCubic(range(p, 0, 0.05));
  const spinOut = easeInCubic(range(p, 0.95, 1));

  const angle = lerp(-FACING_AWAY, 0, spinIn) + lerp(0, FACING_AWAY, spinOut);
  const turn = Math.min(1, Math.abs(angle) / FACING_AWAY);

  const fade = range(p, 0, 0.012) * (1 - range(p, 0.99, 1));
  const dip = swapAt === undefined ? 1 : swapDip(p, swapAt);

  return {
    angle,
    showingBack: Math.abs(angle) > 90,
    power: range(p, 0.04, 0.09),
    presence: fade * dip,
    depth: turn,
  };
}

/** Transform for the whole device: the turn, plus a little dolly. */
export function deviceTransform(t: Timeline): string {
  const z = -t.depth * 140;
  const scale = 1 - t.depth * 0.08;
  return `translateZ(${z.toFixed(1)}px) rotateY(${t.angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
}

/**
 * Where the workflow inside the screen is, for one chapter.
 *
 * Separate from the turn: the screen keeps playing through chapter changes
 * while the hardware stays still.
 */
export function playFor(within: number): number {
  return range(within, 0.08, 0.9);
}
