"use client";

import { useEffect, useState } from "react";

/**
 * Decides whether this visitor gets the WebGL scene.
 *
 * Zaplex sells to shop owners in Nigeria, most of whom arrive on a mid-range
 * Android over metered mobile data. A three-megabyte 3D bundle is the wrong
 * thing to push at someone paying by the megabyte, and a scene that stutters
 * reads as cheap rather than expensive — the opposite of the intent.
 *
 * So the cinematic path is opt-in by capability, and everyone else gets the
 * lightweight canvas telling the same story. This is the "graceful degradation
 * for weaker devices" the brief asks for, taken seriously.
 */

export type Tier = "unknown" | "cinematic" | "lite";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

function hasWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export function detectTier(): Tier {
  if (typeof window === "undefined") return "unknown";

  // ?render=cinematic forces the scene on, ?render=lite forces it off. Lets
  // anyone preview either path on the device in their hand rather than having
  // to find a phone that trips the heuristics.
  const override = new URLSearchParams(window.location.search).get("render");
  if (override === "cinematic") return "cinematic";
  if (override === "lite") return "lite";

  // Someone who asked for less motion is not asking for a camera flythrough.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "lite";

  if (!hasWebGl()) return "lite";

  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  // Data Saver on, or a slow connection: do not spend their bundle on this.
  const connection = nav.connection;
  if (connection?.saveData) return "lite";
  if (connection?.effectiveType && /(^|\W)(slow-)?2g|3g$/.test(connection.effectiveType)) {
    return "lite";
  }

  // Rough proxies for a device that will hold 60fps. Both are absent on iOS
  // Safari, so a missing value is treated as capable rather than as a failure.
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return "lite";
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4) {
    return "lite";
  }

  return "cinematic";
}

export function useTier(): Tier {
  // Starts unknown so the server and the first client paint agree.
  const [tier, setTier] = useState<Tier>("unknown");
  useEffect(() => setTier(detectTier()), []);
  return tier;
}

export type ScrollState = {
  /** Where the scroll actually is, 0 to 1. */
  target: number;
  /** Where the scene has caught up to. Read this. */
  value: number;
};

/**
 * Scroll progress through an element, written into a mutable object rather
 * than React state.
 *
 * The scene reads this inside useFrame, so the value updates every frame while
 * React re-renders none of it. Driving a 3D camera through useState would
 * re-render the tree sixty times a second to move one number.
 *
 * Damping lives here rather than in a smooth-scroll library, so the page keeps
 * native scrolling, keyboard paging and mobile momentum, and only the animation
 * glides.
 */
export function useDampedProgress(
  ref: React.RefObject<HTMLElement | null>,
  damping = 0.09
): ScrollState {
  const [state] = useState<ScrollState>(() => ({ target: 0, value: 0 }));

  useEffect(() => {
    let raf = 0;

    function tick() {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const raw = scrollable > 0 ? -rect.top / scrollable : 0;
        state.target = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      }
      state.value += (state.target - state.value) * damping;
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, damping, state]);

  return state;
}
