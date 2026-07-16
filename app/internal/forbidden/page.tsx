import { auth } from "@clerk/nextjs/server";
import { InternalForbiddenActions } from "@/components/internal/internal-forbidden-actions";

export default async function InternalForbiddenPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-slate-400">
          {userId
            ? "You’re signed in, but this account is not on the staff allowlist."
            : "You do not have permission to view the internal ops console."}
        </p>
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-left text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-slate-100">How to get access</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              Sign in at{" "}
              <span className="font-mono text-slate-200">/internal/sign-in</span>{" "}
              with your staff email.
            </li>
            <li>
              In Vercel → Environment Variables, set{" "}
              <code className="rounded bg-slate-800 px-1">
                INTERNAL_ADMIN_EMAILS
              </code>{" "}
              to that exact email, then redeploy.
            </li>
            <li>
              Open{" "}
              <code className="rounded bg-slate-800 px-1">/internal</code>{" "}
              again.
            </li>
          </ol>
        </div>
        <InternalForbiddenActions isSignedIn={Boolean(userId)} />
      </div>
    </div>
  );
}
