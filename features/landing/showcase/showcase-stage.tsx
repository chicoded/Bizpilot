"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneFrame, LaptopFrame } from "./device-frames";
import { timelineFor } from "./assembly";
import {
  ScanScreen,
  PayScreen,
  DashboardScreen,
  AiScreen,
} from "./app-screens";

/**
 * The product tour, scrubbed by scroll.
 *
 * One device on screen at a time. The previous version stacked the copy on top
 * of the device in the same grid cell, which is how the headline ended up
 * sitting across a phone mockup. Here the copy and the device are separate
 * columns on desktop and separate rows on mobile, so they cannot overlap at
 * any width.
 */

type Chapter = {
  eyebrow: string;
  title: string;
  body: string;
  device: "phone" | "laptop";
  render: (p: number) => React.ReactNode;
};

const CHAPTERS: Chapter[] = [
  {
    eyebrow: "01 · At the counter",
    title: "Scan it, or just start typing",
    body: "Barcode or name, whichever is faster. The till is built for one hand and a queue — large targets, no menus to hunt through.",
    device: "phone",
    render: (p) => <ScanScreen p={p} />,
  },
  {
    eyebrow: "02 · Take the money",
    title: "Cash, transfer, or on credit",
    body: "The total is the biggest thing on the screen, because it is the number you and the customer both check. Receipt prints, stock comes down, the books update.",
    device: "phone",
    render: (p) => <PayScreen p={p} />,
  },
  {
    eyebrow: "03 · When the signal goes",
    title: "The queue does not wait for your network",
    body: "The sale is recorded on the phone first and settles with the cloud afterwards. Two devices selling the last unit is handled too — one wins, the other is told before stock goes negative.",
    device: "phone",
    render: (p) => <PayScreen p={p} offline />,
  },
  {
    eyebrow: "04 · In the back office",
    title: "The same sale, already counted",
    body: "What came in, what went out, what is left on the shelf, and who still owes you. One screen, no adding up at the end of the day.",
    device: "laptop",
    render: (p) => <DashboardScreen p={p} />,
  },
  {
    eyebrow: "05 · Ask it anything",
    title: "Answers from your own books",
    body: "The assistant reads your real stock and sales before it replies, and tells you where the number came from. It will say it does not know rather than invent a figure.",
    device: "laptop",
    render: (p) => <AiScreen p={p} />,
  },
];

export function ShowcaseStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [local, setLocal] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let queued = false;

    function measure() {
      queued = false;
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const raw = scrollable > 0 ? -rect.top / scrollable : 0;
      const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;

      const span = 1 / CHAPTERS.length;
      const index = Math.min(CHAPTERS.length - 1, Math.floor(p / span));
      const within = (p - index * span) / span;

      setActive((current) => (current === index ? current : index));
      // Quantised, but finely: the assembly happens in the first fifth of a
      // chapter, so a coarse step count would make the snap stutter. 140 steps
      // is smooth there while still bounding re-renders — a chapter spans a
      // whole viewport of scrolling, so this is far below one per frame.
      setLocal((current) => {
        const next = Math.round(within * 140) / 140;
        return current === next ? current : next;
      });
    }

    function onScroll() {
      // Coalesce to one measurement per frame without holding a rAF loop open
      // for the life of the page.
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const chapter = CHAPTERS[active];
  // Reduced motion skips the assembly entirely: the device is simply present,
  // with its workflow finished, rather than flying together and apart.
  const p = reduced ? 0.5 : local;
  // The workflow runs on its own clock inside the chapter, so it starts after
  // the shell has landed and finishes before it comes apart.
  const play = reduced ? 1 : timelineFor(local).play;

  return (
    <section
      ref={sectionRef}
      className="relative bg-slate-50 dark:bg-[#070a10]"
      style={{ height: `${CHAPTERS.length * 100}vh` }}
      aria-label="Product tour"
    >
      <div className="sticky top-0 flex min-h-screen flex-col justify-center overflow-hidden py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5">
          {/* Two independent columns on desktop, two stacked rows on mobile.
              Nothing is absolutely positioned over anything else. */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Copy */}
            <div
              className={cn(
                "order-2 lg:order-none",
                chapter.device === "laptop" && "lg:order-2"
              )}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                {chapter.eyebrow}
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {chapter.title}
              </h2>
              <p className="mt-4 max-w-md text-pretty leading-relaxed text-slate-600 dark:text-white/60">
                {chapter.body}
              </p>

              {active === 0 && (
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/sign-up"
                    className="group inline-flex h-13 min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-base font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Start free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </Link>
                </div>
              )}

              {/* Progress through the tour */}
              <div className="mt-8 flex gap-1.5" aria-hidden>
                {CHAPTERS.map((c, i) => (
                  <span
                    key={c.eyebrow}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === active
                        ? "w-8 bg-indigo-500"
                        : "w-3 bg-slate-300 dark:bg-white/15"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Device — one at a time, and it changes with the chapter */}
            <div
              className={cn(
                "order-1 flex justify-center lg:order-none",
                chapter.device === "laptop" && "lg:order-1"
              )}
            >
              {/* Keyed by chapter, not by device type: each chapter's device
                  should assemble from nothing and leave again, so a phone
                  chapter following a phone chapter still rebuilds rather than
                  swapping its screen behind an unchanged shell. */}
              {chapter.device === "phone" ? (
                <PhoneFrame key={`phone-${active}`} progress={p}>
                  {chapter.render(play)}
                </PhoneFrame>
              ) : (
                <LaptopFrame key={`laptop-${active}`} progress={p}>
                  {chapter.render(play)}
                </LaptopFrame>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
