"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDampedProgress, useTier } from "./capability";
import { OfflineStory } from "@/features/landing/sections/offline-story";

/**
 * The scene is loaded only for visitors whose device can hold it, so the
 * three-megabyte WebGL bundle never reaches a phone that would stutter through
 * it — or a metered connection paying by the megabyte.
 */
const CinemaScene = dynamic(
  () => import("./scene").then((mod) => mod.CinemaScene),
  { ssr: false }
);

/**
 * Chapters of one continuous scroll. Copy is deliberately claim-checked: every
 * line describes something the product does today.
 */
const CHAPTERS = [
  {
    at: 0,
    eyebrow: "The arrival",
    title: "Run your entire business. Anywhere.",
    body: "Inventory, point of sale, customers, accounting, analytics and an assistant that reads your own books. One platform.",
  },
  {
    at: 0.16,
    eyebrow: "Sync",
    title: "Every device tells the same story",
    body: "Ring up a sale on the phone at the counter and the laptop in the back office already knows. When the network drops, the phone keeps selling and settles up later.",
  },
  {
    at: 0.36,
    eyebrow: "The floor",
    title: "Scan, sell, done",
    body: "Barcode in, receipt out, stock down, books updated. Six seconds a sale, and it does not stop when the signal does.",
  },
  {
    at: 0.55,
    eyebrow: "Taken apart",
    title: "Hardware is only half of it",
    body: "Underneath the glass and the aluminium, the thing your shop actually runs on is the software. Here it is, module by module.",
  },
  {
    at: 0.78,
    eyebrow: "Put back together",
    title: "One platform. One set of numbers.",
    body: "Twelve jobs that used to live in twelve notebooks, sharing the same records — so the totals still agree on Friday evening.",
  },
];

function useTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => setDark(root.classList.contains("dark"));
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

export function CinemaStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const scroll = useDampedProgress(sectionRef);
  const detected = useTier();
  const dark = useTheme();
  const [active, setActive] = useState(0);
  // Set when the GPU drops the context, which pins us to the lite path for the
  // rest of the visit rather than remounting a scene that just failed.
  const [gpuFailed, setGpuFailed] = useState(false);
  const tier = gpuFailed ? "lite" : detected;

  // Chapter copy is React state, but it changes a handful of times across the
  // whole scroll — unlike the scene, which updates every frame off the ref.
  useEffect(() => {
    let raf = 0;
    function tick() {
      const p = scroll.value;
      let next = 0;
      for (let i = 0; i < CHAPTERS.length; i++) {
        if (p >= CHAPTERS[i].at) next = i;
      }
      setActive((current) => (current === next ? current : next));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scroll]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative h-[600vh]",
        dark ? "bg-[#030303]" : "bg-[#EEF1F8]"
      )}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {tier === "cinematic" ? (
          <div className="absolute inset-0">
            <CinemaScene
              scroll={scroll}
              dark={dark}
              onContextLost={() => setGpuFailed(true)}
            />
          </div>
        ) : tier === "lite" ? (
          // Same story, no WebGL: the lightweight canvas sequence.
          <div className="absolute inset-0 flex items-center justify-center px-5">
            <div className="w-full max-w-5xl">
              <OfflineStory />
            </div>
          </div>
        ) : null}

        {/* Legibility floor under the copy, in both themes. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            dark
              ? "bg-gradient-to-b from-[#030303] via-transparent to-[#030303]"
              : "bg-gradient-to-b from-[#EEF1F8] via-transparent to-[#EEF1F8]"
          )}
        />

        <div className="pointer-events-none relative flex h-full items-end pb-16 sm:items-center sm:pb-0">
          <div className="mx-auto w-full max-w-5xl px-5">
            <div className="max-w-xl">
              {CHAPTERS.map((c, i) => (
                <div
                  key={c.eyebrow}
                  aria-hidden={i !== active}
                  className={cn(
                    "transition-all duration-700 ease-out",
                    i === active
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none absolute translate-y-3 opacity-0"
                  )}
                >
                  <p
                    className={cn(
                      "text-[0.7rem] font-semibold uppercase tracking-[0.2em]",
                      dark ? "text-indigo-300/85" : "text-indigo-600"
                    )}
                  >
                    {c.eyebrow}
                  </p>
                  <h2
                    className={cn(
                      "mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl",
                      dark ? "text-white" : "text-slate-900"
                    )}
                  >
                    {c.title}
                  </h2>
                  <p
                    className={cn(
                      "mt-4 max-w-lg text-pretty leading-relaxed",
                      dark ? "text-white/60" : "text-slate-600"
                    )}
                  >
                    {c.body}
                  </p>

                  {i === 0 && (
                    <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/sign-up"
                        className="group inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-xl bg-indigo-500 px-7 text-base font-semibold text-white transition-[background-color,box-shadow] hover:bg-indigo-400 hover:shadow-[0_0_36px_-6px_rgba(99,102,241,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
                        style={{ ["--tw-ring-offset-color" as string]: dark ? "#030303" : "#EEF1F8" }}
                      >
                        Start free
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                      </Link>
                      <Link
                        href="#tour"
                        className={cn(
                          "inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-xl border px-7 text-base font-semibold backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2",
                          dark
                            ? "border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] focus-visible:ring-white/60"
                            : "border-slate-300 bg-white/70 text-slate-900 hover:bg-white focus-visible:ring-slate-400"
                        )}
                      >
                        <Play className="h-4 w-4" />
                        Take the tour
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chapter position, and a hint that this is a scroll. */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
          {CHAPTERS.map((c, i) => (
            <span
              key={c.eyebrow}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === active
                  ? "w-8 bg-indigo-400"
                  : dark
                    ? "w-2 bg-white/20"
                    : "w-2 bg-slate-400/40"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
