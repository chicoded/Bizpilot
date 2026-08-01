import { describe, expect, it } from "vitest";
import {
  deviceTransform,
  playFor,
  timelineFor,
} from "@/features/landing/showcase/motion";

/**
 * The device turns exactly twice across the whole tour — in at the start, away
 * at the end — and stays square while features change. Spinning per chapter
 * made the turn a tic, so "twice, and only twice" is the property under test.
 */

describe("the two turns", () => {
  it("arrives showing its back", () => {
    const t = timelineFor(0);
    expect(Math.abs(t.angle)).toBeGreaterThan(90);
    expect(t.showingBack).toBe(true);
  });

  it("is square to the viewer once the entrance is done", () => {
    const t = timelineFor(0.06);
    expect(Math.abs(t.angle)).toBeLessThan(1);
    expect(t.showingBack).toBe(false);
  });

  it("stays square through every feature in between", () => {
    // The whole point: no turning while the screen changes.
    for (let p = 0.1; p <= 0.94; p += 0.02) {
      const t = timelineFor(p);
      expect(Math.abs(t.angle), `turned at p=${p.toFixed(2)}`).toBeLessThan(0.5);
      expect(t.depth).toBeCloseTo(0, 2);
    }
  });

  it("turns away only at the very end", () => {
    expect(Math.abs(timelineFor(0.94).angle)).toBeLessThan(0.5);
    expect(Math.abs(timelineFor(1).angle)).toBeGreaterThan(90);
    expect(timelineFor(1).showingBack).toBe(true);
  });

  it("crosses the quarter turn exactly twice over the whole tour", () => {
    // Once entering, once leaving. A third crossing would be a spin nobody
    // asked for.
    let crossings = 0;
    let wasBack = timelineFor(0).showingBack;
    for (let p = 0; p <= 1.0001; p += 0.002) {
      const isBack = timelineFor(p).showingBack;
      if (isBack !== wasBack) crossings += 1;
      wasBack = isBack;
    }
    expect(crossings).toBe(2);
  });
});

describe("presence", () => {
  it("never leaves 0..1", () => {
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const t = timelineFor(p, 0.6);
      expect(t.presence).toBeGreaterThanOrEqual(0);
      expect(t.presence).toBeLessThanOrEqual(1);
    }
  });

  it("dips where the phone gives way to the laptop", () => {
    const at = 0.6;
    const during = timelineFor(at, at).presence;
    const before = timelineFor(at - 0.05, at).presence;
    const after = timelineFor(at + 0.05, at).presence;

    expect(during).toBeLessThan(0.25);
    expect(before).toBeCloseTo(1, 1);
    expect(after).toBeCloseTo(1, 1);
  });

  it("does not dip when there is no device change", () => {
    for (let p = 0.1; p <= 0.9; p += 0.05) {
      expect(timelineFor(p).presence).toBeCloseTo(1, 2);
    }
  });
});

describe("device transform", () => {
  it("rotates on Y and pulls back while turning", () => {
    const away = deviceTransform(timelineFor(0));
    expect(away).toMatch(/rotateY\(-1[78]\d/);
    expect(away).toContain("translateZ(-140");
  });

  it("is square and unscaled while features play", () => {
    const facing = deviceTransform(timelineFor(0.5));
    expect(facing).toContain("rotateY(0.00deg)");
    expect(facing).toContain("scale(1.000");
  });
});

describe("the workflow clock", () => {
  it("runs per chapter, independent of the turn", () => {
    expect(playFor(0)).toBe(0);
    expect(playFor(0.5)).toBeGreaterThan(0.3);
    expect(playFor(1)).toBeCloseTo(1, 2);
  });

  it("settles before the chapter ends so the last frame is readable", () => {
    expect(playFor(0.9)).toBeCloseTo(1, 2);
  });
});
