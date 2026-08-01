"use client";

import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { reviews, sampleReviews } from "@/features/landing/reviews-data";

/**
 * Real reviews when there are any; placeholders while laying the section out in
 * development, and nothing at all in production until a real one is added.
 */
const shown = reviews.length > 0 ? reviews : sampleReviews;
const isPlaceholder = reviews.length === 0 && shown.length > 0;

/**
 * Auto-rotating glass cards — but only over reviews that exist.
 *
 * reviews-data.ts ships empty, so this renders nothing until real quotes are
 * added. Placing invented testimonials on a page that takes payment is
 * deceptive to buyers and treated as false advertising under the FCCPA; a
 * missing section costs far less than a fabricated one.
 */
export function Testimonials() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (entry.isIntersecting) {
          timer = window.setInterval(
            () => setActive((i) => (i + 1) % shown.length),
            5000
          );
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  if (shown.length === 0) return null;

  return (
    <section className="border-y border-border bg-secondary/40">
      <div ref={ref} className="mx-auto max-w-4xl px-5 py-28">
        <h2 className="text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          From shops already running on it
        </h2>

        {/* Only ever rendered in development, alongside placeholder copy. It
            exists so nobody can screenshot this section and mistake it for
            live social proof. */}
        {isPlaceholder && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-2 text-center text-sm font-medium text-warning">
            Placeholder text — layout preview only. Nothing here ships; add real
            quotes to reviews-data.ts.
          </p>
        )}

        <div className="relative mt-12 min-h-[15rem]">
          {shown.map((review, index) => (
            <figure
              key={`${review.shop}-${review.name}`}
              aria-hidden={index !== active}
              className={cn(
                "absolute inset-0 rounded-2xl border border-border bg-card p-7 backdrop-blur-md transition-all duration-700",
                index === active
                  ? "translate-y-0 opacity-100 blur-0"
                  : "pointer-events-none translate-y-3 opacity-0 blur-[2px]"
              )}
            >
              <Quote className="h-6 w-6 text-primary" aria-hidden />
              <blockquote className="mt-4 text-pretty text-lg leading-relaxed text-foreground">
                {review.quote}
              </blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold text-foreground">{review.name}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {review.shop} · {review.location} · {review.trade}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {shown.length > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {shown.map((review, index) => (
              <button
                key={`${review.shop}-dot`}
                type="button"
                aria-label={`Show review from ${review.name}`}
                onClick={() => setActive(index)}
                className="flex h-11 items-center px-1 rounded touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    index === active ? "w-8 bg-primary" : "w-3 bg-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
