"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Shared shell for public auth screens with night mode. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 md:right-6 md:top-6">
        <ThemeToggle variant="full" />
      </div>
      <div className="flex min-h-screen items-center justify-center">
        {children}
      </div>
    </div>
  );
}
