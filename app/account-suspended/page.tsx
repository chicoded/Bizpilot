import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function AccountSuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Account suspended
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This business account is temporarily unavailable. Contact support if you
          believe this is a mistake.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SignOutButton>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Sign out
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
