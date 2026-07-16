import Link from "next/link";

export default function InternalForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-slate-400">
          You do not have permission to view this area.
        </p>
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
