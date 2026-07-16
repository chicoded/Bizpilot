import Link from "next/link";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { getInternalDashboardMetrics } from "@/lib/internal/metrics";
import { formatCurrency, formatDate } from "@/lib/utils";

function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

export default async function InternalDashboardPage() {
  await requireInternalAdmin("dashboard:view");
  const m = await getInternalDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Operations dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live platform metrics from production data.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open support tickets"
          value={String(m.openSupportTickets)}
          hint="Bug reports needing attention"
          href="/internal/support"
        />
        <MetricCard label="Total businesses" value={String(m.totalBusinesses)} />
        <MetricCard
          label="Active businesses"
          value={String(m.activeBusinesses)}
          hint={`${m.suspendedBusinesses} suspended`}
        />
        <MetricCard label="Users" value={String(m.totalUsers)} />
        <MetricCard
          label="Subscriptions"
          value={String(m.activeSubscriptions)}
          hint={`${m.trialSubscriptions} trials`}
        />
        <MetricCard label="MRR" value={formatCurrency(m.mrr)} />
        <MetricCard label="ARR" value={formatCurrency(m.arr)} />
        <MetricCard
          label="Revenue (all time)"
          value={formatCurrency(m.revenueAllTime)}
        />
        <MetricCard
          label="Revenue (month)"
          value={formatCurrency(m.monthRevenue)}
          hint={`${m.monthTransactions} payments`}
        />
        <MetricCard label="Signups today" value={String(m.todaySignups)} />
        <MetricCard label="Signups this month" value={String(m.monthSignups)} />
        <MetricCard label="AI requests today" value={String(m.aiToday)} />
        <MetricCard label="AI requests month" value={String(m.aiMonth)} />
        <MetricCard label="Products" value={String(m.productCount)} />
        <MetricCard label="Customers" value={String(m.customerCount)} />
        <MetricCard
          label="Payments today"
          value={formatCurrency(m.todayRevenue)}
          hint={`${m.todayTransactions} txns`}
        />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-200">
              Latest bug reports
            </p>
            <p className="text-xs text-slate-500">
              From Settings → Help & support
            </p>
          </div>
          <Link
            href="/internal/support"
            className="text-sm text-emerald-400 hover:underline"
          >
            View all →
          </Link>
        </div>

        {m.recentSupportTickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No reports yet. When a customer taps{" "}
            <span className="text-slate-300">Submit report</span>, it shows
            here and under{" "}
            <Link href="/internal/support" className="text-emerald-400 hover:underline">
              Support
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800">
            {m.recentSupportTickets.map((t) => (
              <li key={t.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{t.summary}</p>
                  <p className="text-xs text-slate-500">
                    {[t.businessName, t.email].filter(Boolean).join(" · ") ||
                      "No contact"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <p>{t.status.replace("_", " ")}</p>
                  <p>{formatDate(t.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm font-medium text-slate-200">Signups · last 7 days</p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {m.signupSpark.map((d) => (
            <div key={d.date} className="text-center">
              <div className="mx-auto flex h-24 items-end justify-center rounded bg-slate-950/80 px-1">
                <div
                  className="w-full rounded-t bg-emerald-500/80"
                  style={{ height: `${Math.max(d.count * 18, d.count > 0 ? 8 : 2)}px` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{d.date.slice(5)}</p>
              <p className="text-xs text-slate-300">{d.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
