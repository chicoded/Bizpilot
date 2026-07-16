import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

const PLAN_PRICE: Record<string, number> = {
  STARTER: 5000,
  BUSINESS: 15000,
  AI_PRO: 30000,
};

export default async function InternalSubscriptionsPage() {
  await requireInternalAdmin("subscriptions:view");

  const subscriptions = await prisma.subscription.findMany({
    include: {
      business: { select: { id: true, name: true, suspendedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 150,
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
                    <span className="ml-2 text-xs text-amber-400">suspended</span>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
