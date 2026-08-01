import { Reveal } from "@/features/landing/reveal";

/**
 * Numbered because this is a real sequence — you cannot ring up stock you have
 * not entered. Decorative numbering elsewhere on the page would be noise, but
 * here the order is the information.
 */
const steps = [
  {
    title: "Tell it what you sell",
    body: "Type a few products or scan their barcodes. A pharmacy is asked for NAFDAC number and expiry; a boutique is asked for size and colour. You only see the fields your trade actually uses.",
    aside: "About 10 minutes for a first shelf",
  },
  {
    title: "Sell from your phone",
    body: "Tap the item, take cash or transfer, hand over the receipt. Big buttons, no menus to hunt through, and it keeps working when the network doesn't.",
    aside: "Roughly 6 seconds a sale",
  },
  {
    title: "Check the day before you close",
    body: "What came in, what went out, what is left on the shelf, and who still owes you. One screen, no adding up.",
    aside: "One glance, most evenings",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <Reveal>
        <h2 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Running it takes three habits
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-center text-muted-foreground">
          No training day, no consultant. If you can use WhatsApp, you can use
          this.
        </p>
      </Reveal>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 90}>
            <li className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft">
              <span className="tnum mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="text-balance font-semibold leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <p className="mt-4 border-t border-border pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {step.aside}
              </p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
