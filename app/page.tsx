import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { ZaplexMark } from "@/components/brand/zaplex-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ShowcaseStage } from "@/features/landing/showcase/showcase-stage";
import { LandingIllustration } from "@/features/landing/illustration";
import {
  ChaosToControl,
  AiAssistant,
  Analytics,
  Automation,
  FinalCta,
} from "@/features/landing/cinematic/sections";
import { Industries } from "@/features/landing/cinematic/industries";
import { Pricing } from "@/features/landing/cinematic/pricing";
import { Testimonials } from "@/features/landing/cinematic/testimonials";

/**
 * The marketing page commits to one dark treatment rather than following the
 * app's theme. It is a single composed scene — the hero canvas fades from a
 * fixed near-black — and a light variant would fight that rather than serve it.
 * The app itself stays theme-aware; only this page is fixed.
 */
export default function LandingPage() {
  // Built on the app's own semantic tokens rather than hardcoded whites, so
  // light and dark both work and the marketing page matches the product a
  // visitor is about to sign into. The theme follows the toggle in the nav.
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Reveal-on-scroll starts elements at opacity 0 and waits for
          IntersectionObserver. Without scripting that observer never runs, so
          everything below the hero would stay invisible. */}
      <noscript>
        <style>{`[data-shown]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[200] rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ZaplexMark className="h-8 w-8" title={null} />
            <span className="text-lg font-semibold tracking-tight">Zaplex</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Visitors decide the theme here, not the page. */}
            <ThemeToggle />
            <SignedOut>
              <Link
                href="/sign-in"
                className="hidden h-11 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </SignedIn>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Static hero, then the scroll-driven tour. The WebGL stage in
            features/landing/cinema is no longer rendered: its fallback layered
            a device mockup underneath this headline, and a tour you can read
            beats a scene most of this audience's phones would not run. */}
        <section className="mx-auto max-w-6xl px-5 pb-4 pt-28 sm:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              The business operating system
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-6xl">
              Run your entire business.
              <br className="hidden sm:block" />{" "}
              {/* Gradient endpoints are tuned per theme: the light-mode ramp
                  needs darker stops to stay readable on a pale ground. */}
              <span className="bg-gradient-to-r from-indigo-600 via-primary to-emerald-600 bg-clip-text text-transparent dark:from-indigo-300 dark:via-white dark:to-emerald-300">
                Anywhere.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Inventory, point of sale, customers, accounting, analytics and an
              assistant that reads your own books. One platform — and it keeps
              working when the signal doesn&rsquo;t.
            </p>
          </div>

          {/* Faces before hardware. The scroll tour below is all devices and
              screens; leading with people using them is what a visitor is
              actually trying to picture. priority because at this position it
              is the largest-contentful paint on most screens. */}
          <LandingIllustration
            src="/illustrations/team-reviewing-analytics.jpg"
            alt="A team gathered around laptops and a tablet, reviewing sales charts together on a screen"
            width={735}
            height={490}
            priority
            className="mx-auto mt-12 max-w-4xl"
          />
        </section>

        <ShowcaseStage />
        <ChaosToControl />
        <AiAssistant />
        <Analytics />
        <Industries />
        <Automation />
        <Testimonials />
        <Pricing />
        <FinalCta />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <ZaplexMark className="h-6 w-6" title={null} />
            <span>© {new Date().getFullYear()} Zaplex</span>
          </div>
          <Link
            href="/support"
            className="rounded font-medium underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Report a bug or contact support
          </Link>
        </div>
      </footer>
    </div>
  );
}
