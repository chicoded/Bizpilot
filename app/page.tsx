import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { ZaplexMark } from "@/components/brand/zaplex-mark";
import { ShowcaseStage } from "@/features/landing/showcase/showcase-stage";
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
  // `dark` is scoped on the wrapper rather than left to the app's theme class:
  // this page commits to one dark treatment, and without it a visitor whose app
  // theme is light would get light panels inside a black page.
  return (
    <div className="dark min-h-screen bg-[#050505] text-white antialiased">
      {/* Reveal-on-scroll starts elements at opacity 0 and waits for
          IntersectionObserver. Without scripting that observer never runs, so
          everything below the hero would stay invisible. */}
      <noscript>
        <style>{`[data-shown]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[200] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#050505]"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#050505]/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ZaplexMark className="h-8 w-8" title={null} />
            <span className="text-lg font-semibold tracking-tight">Zaplex</span>
          </Link>

          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/sign-in"
                className="hidden h-11 items-center rounded-lg px-4 text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-white/90"
              >
                Start free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-white/90"
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
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              The business operating system
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-6xl">
              Run your entire business.
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-white to-emerald-300 bg-clip-text text-transparent">
                Anywhere.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/60">
              Inventory, point of sale, customers, accounting, analytics and an
              assistant that reads your own books. One platform — and it keeps
              working when the signal doesn&rsquo;t.
            </p>
          </div>
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

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-sm text-white/40 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <ZaplexMark className="h-6 w-6" title={null} />
            <span>© {new Date().getFullYear()} Zaplex</span>
          </div>
          <Link
            href="/support"
            className="rounded font-medium underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Report a bug or contact support
          </Link>
        </div>
      </footer>
    </div>
  );
}
