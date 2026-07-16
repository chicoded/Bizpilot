import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

const PLAN_PRICE: Record<string, number> = {
  STARTER: 5000,
  BUSINESS: 15000,
  AI_PRO: 30000,
};

export default async function InternalSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireInternalAdmin("subscriptions:view");
  const params = searchParams ? await searchParams : {};
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const subscriptions = await prisma.subscription.findMany({
    where: {
      AND: [
        status
          ? { status: status as "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" }
          : {},
        q
          ? {
              business: {
                name: { contains: q, mode: "insensitive" },
              },
            }
          : {},
      ],
    },
    include: {
      business: { select: { id: true, name: true, suspendedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + (PLAN_PRICE[s.plan] ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
        <p className="text-sm text-slate-400">
          Active MRR {formatCurrency(mrr)} · {subscriptions.length} listed
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search business name"
          className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="TRIAL">TRIAL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Period end</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-t border-slate-800">
                <td className="px-3 py-2">
                  <Link
                    href={`/internal/businesses/${s.business.id}`}
                    className="text-emerald-400 hover:underline"
                  >
                    {s.business.name}
                  </Link>
                  {s.business.suspendedAt ? (
                    <span className="ml-2 text-xs text-amber-400">
                      suspended
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{s.plan}</td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2 text-slate-400">
                  {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "—"}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(s.updatedAt)}
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No subscriptions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
