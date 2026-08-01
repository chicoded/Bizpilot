"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { HeroCanvas } from "./hero-canvas";

/**
 * Full-viewport hero with a sticky canvas scrubbed by scroll.
 *
 * Scroll progress is read in a rAF loop rather than a scroll handler, so
 * nothing runs between frames and the browser keeps native scrolling — no
 * hijacking library, which would break keyboard paging and mobile momentum.
 */
export function CinematicHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let raf = 0;

    function tick() {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const p = scrollable > 0 ? -rect.top / scrollable : 0;
        const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
        progressRef.current = clamped;
        setPhase(clamped < 0.3 ? 0 : clamped < 0.7 ? 1 : 2);
      }
      raf = window.requestAnimationFrame(tick);
    }

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const captions = [
    "Paper, guesswork, and a calculator.",
    "Every record finding its place.",
    "One system, and the whole shop in view.",
  ];

  return (
    <section ref={sectionRef} className="relative h-[320vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0">
          <HeroCanvas progressRef={progressRef} />
        </div>

        {/* Keeps headline contrast steady as the canvas brightens behind it. */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/45 to-[#050505]"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col items-center justify-center px-5 text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            The business operating system
          </p>

          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Run your entire business
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-white to-emerald-300 bg-clip-text text-transparent">
              from one intelligent platform
            </span>
          </h1>

          <ul className="mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-sm text-white/60 sm:text-base">
            {[
              "Inventory",
              "Sales",
              "Accounting",
              "Customers",
              "Analytics",
              "AI automation",
            ].map((item, index) => (
              <li key={item} className="flex items-center gap-2.5">
                {index > 0 && (
                  <span className="h-1 w-1 rounded-full bg-white/25" aria-hidden />
                )}
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-base font-medium text-white/80">
            Everything connected.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="group inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-xl bg-indigo-500 px-7 text-base font-semibold text-white transition-[background-color,box-shadow] hover:bg-indigo-400 hover:shadow-[0_0_36px_-6px_rgba(99,102,241,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              Start free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <Link
              href="#tour"
              className="inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-7 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              <Play className="h-4 w-4" />
              Take the tour
            </Link>
          </div>

          {/* Narrates the animation for anyone who cannot perceive it. */}
          <p
            aria-live="polite"
            className="mt-10 h-5 text-sm text-white/45 transition-opacity duration-500"
          >
            {captions[phase]}
          </p>
        </div>
      </div>
    </section>
  );
}
