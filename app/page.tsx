import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  Sparkles,
  BarChart3,
  Package,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/features/landing/landing-nav";

const features = [
  {
    icon: Sparkles,
    title: "AI Business Advisor",
    description:
      "Ask anything — earnings, stock levels, who owes you. Get instant answers in plain English.",
  },
  {
    icon: BarChart3,
    title: "Business Health Score",
    description:
      "One number tells you how your business is doing. Strengths, warnings, and actions — instantly.",
  },
  {
    icon: Package,
    title: "Smart Inventory",
    description:
      "Track stock, expiry dates, barcodes. AI alerts you before you run out or lose money.",
  },
  {
    icon: Shield,
    title: "Fraud Detection",
    description:
      "Catch stock theft, cash leakage, and suspicious patterns before they hurt your business.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First POS",
    description:
      "Sell fast with large buttons, barcode scanning, and multiple payment methods.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
      <LandingNav />

      {/* Hero */}
      <section className="px-4 py-16 md:py-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-biz-emerald/10 px-4 py-1.5 text-sm font-medium text-biz-emerald mb-6">
          <Sparkles className="h-4 w-4" />
          AI Operating System for African SMEs
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-biz-blue dark:text-foreground md:text-6xl">
          Your AI employee for
          <br />
          <span className="text-biz-emerald">Nigerian business</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Not bookkeeping. Not just inventory. Zaplex is your accountant,
          inventory manager, sales analyst, and business advisor — in one app.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignedOut>
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" variant="success" className="w-full sm:w-auto min-w-[200px]">
                Open Dashboard
              </Button>
            </Link>
          </SignedIn>
          <p className="text-sm text-muted-foreground">
            From ₦5,000/month · 14-day free trial
          </p>
        </div>

        {/* Health score preview */}
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-emerald-200/50 bg-white/80 p-6 text-left shadow-glass backdrop-blur-xl dark:border-emerald-800/40 dark:bg-card/80">
          <p className="mb-3 text-sm font-semibold text-biz-emerald">
            Business Health Score
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-biz-emerald">78</div>
            <div className="text-sm text-muted-foreground">/100 · Good</div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Strong sales this week
            </p>
            <p className="text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              High generator fuel costs
            </p>
            <p className="flex items-center gap-2 text-biz-blue dark:text-primary">
              <CircleDot className="h-4 w-4 shrink-0" />
              Restock Vitamin C · Follow up debtors
            </p>
          </div>
        </div>

        <div className="mt-10 mx-auto max-w-4xl rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-glass overflow-hidden text-left">
          <div className="border-b px-4 py-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive/80" />
            <div className="h-3 w-3 rounded-full bg-warning/80" />
            <div className="h-3 w-3 rounded-full bg-success/80" />
            <span className="text-xs text-muted-foreground ml-2">Zaplex Dashboard</span>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Sales Today", "Profit", "Expenses", "Debt"].map((label) => (
              <div key={label} className="rounded-xl border bg-background p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold text-biz-blue dark:text-primary">₦124,500</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-6xl mx-auto">
        <h2 className="mb-12 text-center text-2xl font-bold text-biz-blue dark:text-foreground md:text-3xl">
          Everything your business needs
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/50 bg-white/80 p-6 shadow-soft backdrop-blur-xl dark:bg-card/80"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-biz-blue/10 text-biz-blue dark:bg-primary/15 dark:text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 max-w-6xl mx-auto text-center">
        <div className="rounded-3xl bg-biz-gradient p-8 md:p-12 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to run your business smarter?
          </h2>
          <p className="text-white/80 mb-6 max-w-lg mx-auto">
            Join pharmacies, retail shops, and supermarkets across Nigeria using
            Zaplex.
          </p>
          <SignedOut>
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-biz-blue hover:bg-white/90"
              >
                Get Started Free
              </Button>
            </Link>
          </SignedOut>
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-sm text-muted-foreground border-t">
        <p>© {new Date().getFullYear()} Zaplex. Built for African SMEs.</p>
      </footer>
    </div>
  );
}
