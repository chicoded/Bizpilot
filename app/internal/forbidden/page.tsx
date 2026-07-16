import Link from "next/link";

export default function InternalForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-slate-400">
          You do not have permission to view the internal ops console.
        </p>
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-left text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-slate-100">How to get access</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Sign in with the email you want as staff admin.</li>
            <li>
              In Vercel → Project → Settings → Environment Variables, set{" "}
              <code className="rounded bg-slate-800 px-1">
                INTERNAL_ADMIN_EMAILS
              </code>{" "}
              to that email (comma-separated if several).
            </li>
            <li>Redeploy Production.</li>
            <li>
              Open{" "}
              <code className="rounded bg-slate-800 px-1">/internal</code>{" "}
              again while signed in with that same email.
            </li>
          </ol>
          <p className="text-slate-500 pt-1">
            Details: INTERNAL_ADMIN.md in the repo.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
