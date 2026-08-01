import { describe, expect, it } from "vitest";
import {
  backOut,
  pieceOpacity,
  pieceTransform,
  timelineFor,
} from "@/features/landing/showcase/assembly";

/**
 * The device assembles, plays its workflow, then comes apart — all inside one
 * chapter. The ordering is what makes it read as a machine putting itself
 * together, so it is pinned here rather than eyeballed.
 */

describe("chapter timeline", () => {
  it("starts with nothing assembled and nothing playing", () => {
    const t = timelineFor(0);
    expect(t.assemble).toBeCloseTo(0, 2);
    expect(t.play).toBe(0);
    expect(t.power).toBe(0);
  });

  it("finishes assembling before the workflow starts", () => {
    // If the screen lit up mid-flight the pieces would look incidental.
    const atAssembled = timelineFor(0.2);
    expect(atAssembled.assemble).toBeGreaterThanOrEqual(1);
    expect(timelineFor(0.2).play).toBe(0);
  });

  it("plays the workflow while the device is whole", () => {
    const mid = timelineFor(0.55);
    expect(mid.play).toBeGreaterThan(0.3);
    expect(mid.play).toBeLessThan(0.9);
    expect(mid.disassemble).toBe(0);
    expect(mid.presence).toBe(1);
  });

  it("finishes the workflow before it comes apart", () => {
    expect(timelineFor(0.84).play).toBeCloseTo(1, 2);
    expect(timelineFor(0.84).disassemble).toBe(0);
  });

  it("is fully gone by the end of the chapter", () => {
    const end = timelineFor(1);
    expect(end.disassemble).toBeCloseTo(1, 2);
    expect(end.presence).toBeCloseTo(0, 2);
  });

  it("flashes once as the last piece lands, not repeatedly", () => {
    const before = timelineFor(0.05).flash;
    const atLanding = timelineFor(0.18).flash;
    const after = timelineFor(0.5).flash;
    expect(atLanding).toBeGreaterThan(before);
    expect(atLanding).toBeGreaterThan(after);
    expect(after).toBeCloseTo(0, 2);
  });

  it("never reports presence outside 0..1", () => {
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const t = timelineFor(p);
      expect(t.presence).toBeGreaterThanOrEqual(0);
      expect(t.presence).toBeLessThanOrEqual(1);
    }
  });
});

describe("the snap", () => {
  it("overshoots past its target before settling", () => {
    // Overshoot is what separates a click from a glide. Without it the pieces
    // ease into place and the assembly reads as a fade.
    const samples = [0.6, 0.7, 0.8, 0.9].map(backOut);
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(backOut(1)).toBeCloseTo(1, 5);
  });

  it("starts at zero", () => {
    expect(backOut(0)).toBeCloseTo(0, 5);
  });
});

describe("piece motion", () => {
  const piece = { from: { x: -140, y: 0, ry: -35 }, delay: 0.1 };

  it("is off-position and invisible before assembly", () => {
    const t = timelineFor(0);
    expect(pieceTransform(piece, t)).toContain("-140");
    expect(pieceOpacity(piece, t)).toBeCloseTo(0, 2);
  });

  it("lands on target and fully visible once assembled", () => {
    const t = timelineFor(0.5);
    const transform = pieceTransform(piece, t);
    expect(transform).toMatch(/translate3d\(0\.00px, 0\.00px, 0\.00px\)/);
    expect(pieceOpacity(piece, t)).toBeCloseTo(1, 2);
  });

  it("has left again by the end", () => {
    const t = timelineFor(1);
    expect(pieceOpacity(piece, t)).toBeCloseTo(0, 2);
    // Flies the opposite way from where it came in.
    expect(pieceTransform(piece, t)).toContain("196");
  });
});
