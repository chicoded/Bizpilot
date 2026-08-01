import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  Sparkles,
  BarChart3,
  Package,
  Shield,
  WifiOff,
  Store,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/features/landing/landing-nav";
import { Reveal } from "@/features/landing/reveal";
import { OfflineStory } from "@/features/landing/sections/offline-story";
import { HowItWorks } from "@/features/landing/sections/how-it-works";
import { Reviews } from "@/features/landing/sections/reviews";

/**
 * Ordered by how hard each one is for a competitor to copy. Offline selling
 * and per-trade setup are the claims that actually distinguish this product;
 * an AI assistant is table stakes now and sits further down deliberately.
 */
const features = [
  {
    icon: WifiOff,
    title: "Keeps selling when the network drops",
    description:
      "Sales, stock and receipts are recorded on the phone itself. When signal returns, everything syncs to your other devices on its own.",
  },
  {
    icon: Store,
    title: "Set up for your kind of shop",
    description:
      "A pharmacy tracks NAFDAC numbers and expiry. A restaurant gets combos and a kitchen screen. You are not handed a spreadsheet and left to adapt.",
  },
  {
    icon: Package,
    title: "Stock that warns you first",
    description:
      "Expiry dates, batch numbers, reorder levels and barcodes. You hear about the problem while you can still return the goods.",
  },
  {
    icon: Shield,
    title: "Shows you where money leaks",
    description:
      "Damage, theft, expiry and returns are recorded separately, so a shortfall has a reason attached instead of quietly becoming your loss.",
  },
  {
    icon: BarChart3,
    title: "One number for how you are doing",
    description:
      "A health score built from your real sales, costs and debts — with the two or three things worth fixing this week.",
  },
  {
    icon: Sparkles,
    title: "Ask in plain English",
    description:
      "What did I earn today? Who owes me? What should I restock? Answers drawn from your own records, not guesses.",
  },
];

/** Trades with their own setup, not a generic template with the name changed. */
const trades = [
  "Pharmacy",
  "Restaurant",
  "Supermarket",
  "Fashion",
  "Electronics",
  "Mini mart",
  "Cafe",
  "Cosmetics",
];

const kpis = [
  { label: "Sales Today", value: "₦124,500" },
  { label: "Profit", value: "₦31,600" },
  { label: "Expenses", value: "₦38,200" },
  { label: "Debt", value: "₦52,000" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Store className="h-3.5 w-3.5" />
            Built for shops in Nigeria
          </p>

          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-6xl">
            Run the shop, even when
            <br className="hidden sm:block" />{" "}
            <span className="text-brand">the network is down</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Zaplex is a till, stock book and account book in one app — set up
            for your trade, and built to keep working when the signal doesn&rsquo;t.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignedOut>
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto sm:min-w-[13rem]">
                  Start free trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto sm:min-w-[13rem]">
                  Open dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </SignedIn>
            <p className="text-sm text-muted-foreground">
              <span className="tnum">₦5,000</span>/month · 14 days free
            </p>
          </div>
        </div>

        {/* Product proof */}
        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-glass">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              Today at a glance
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="tnum mt-1 text-lg font-bold text-foreground">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4 md:p-5">
            <div className="flex items-baseline gap-3">
              <span className="tnum text-3xl font-bold text-success">78</span>
              <span className="text-sm text-muted-foreground">
                Business health · Good
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Sales up on last week
              </li>
              <li className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Generator fuel is running high
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CircleDot className="h-4 w-4 shrink-0" />
                Vitamin C expires in 3 weeks · 4 customers owe you
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* The claim worth showing rather than stating */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <OfflineStory />
        </div>
      </section>

      <HowItWorks />

      {/* Trades */}
      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            Different trades, different setup
          </p>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm text-muted-foreground">
            A chemist and a rice shop do not run the same way, so they do not
            get the same app.
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {trades.map((trade) => (
              <li
                key={trade}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground"
              >
                {trade}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          What you actually get
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 80}>
              <div className="h-full rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-balance font-semibold leading-snug text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reviews />

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-2xl bg-biz-gradient px-6 py-12 text-center md:px-12">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
            Start with today&rsquo;s takings
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-white/85">
            Add your stock, ring up one sale, and see where the day stands. It
            takes about ten minutes.
          </p>
          <SignedOut>
            <Link href="/sign-up" className="mt-7 inline-block">
              <Button
                size="lg"
                className="bg-white text-biz-blue hover:bg-white/90"
              >
                Create your shop
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="mt-7 inline-block">
              <Button
                size="lg"
                className="bg-white text-biz-blue hover:bg-white/90"
              >
                Open dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Zaplex</p>
          <Link
            href="/support"
            className="font-medium underline underline-offset-4 hover:text-foreground"
          >
            Report a bug or contact support
          </Link>
        </div>
      </footer>
    </div>
  );
}
