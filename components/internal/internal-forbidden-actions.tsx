"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export function InternalForbiddenActions({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        href="/internal/sign-in"
        className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Staff sign-in
      </Link>
      {isSignedIn ? (
        <SignOutButton redirectUrl="/internal/sign-in">
          <button
            type="button"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Sign out & try another email
          </button>
        </SignOutButton>
      ) : null}
      <Link
        href="/dashboard"
        className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
      >
        Back to app
      </Link>
    </div>
  );
}
