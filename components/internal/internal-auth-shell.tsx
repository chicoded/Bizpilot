"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Dark staff-only shell for /internal/sign-in */
export function InternalAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-3 md:right-6 md:top-6">
        <ThemeToggle variant="compact" />
      </div>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="w-full text-center space-y-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/30">
            Z
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Zaplex Ops</h1>
          <p className="text-sm text-slate-400">
            Staff console — sign in with your admin email
          </p>
        </div>
        {children}
        <p className="text-center text-xs text-slate-500">
          Not staff?{" "}
          <Link href="/sign-in" className="text-emerald-400 hover:underline">
            Go to customer sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
