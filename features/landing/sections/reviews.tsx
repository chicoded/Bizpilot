import { Quote } from "lucide-react";
import { Reveal } from "@/features/landing/reveal";
import { reviews } from "@/features/landing/reviews-data";

/**
 * Renders nothing until there are real reviews in reviews-data.ts. An empty
 * shelf is honest; a shelf of invented quotes is not, and a shop owner who
 * later discovers the "customers" were made up will not stay one.
 */
export function Reviews() {
  if (reviews.length === 0) return null;

  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Reveal>
          <h2 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            From shops already running on it
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal key={`${review.shop}-${review.name}`} delay={index * 80}>
              <figure className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft">
                <Quote
                  className="h-5 w-5 shrink-0 text-primary/60"
                  aria-hidden="true"
                />
                <blockquote className="mt-3 flex-1 text-pretty leading-relaxed text-foreground">
                  {review.quote}
                </blockquote>
                <figcaption className="mt-4 border-t border-border pt-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {review.name}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {review.shop} · {review.location} · {review.trade}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
