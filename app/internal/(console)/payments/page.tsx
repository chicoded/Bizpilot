import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InternalPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireInternalAdmin("payments:view");
  const params = searchParams ? await searchParams : {};
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const payments = await prisma.paymentTransaction.findMany({
    where: {
      AND: [
        status ? { status } : {},
        q
          ? {
              OR: [
                { reference: { contains: q, mode: "insensitive" } },
                { business: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      business: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const successCount = payments.filter((p) => p.status === "success").length;
  const failedCount = payments.filter(
    (p) => p.status === "failed" || p.status === "cancelled"
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          Billing transactions · {successCount} success · {failedCount} failed
          in this view (refunds: mark/investigate via provider dashboard)
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search business or reference"
          className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">success</option>
          <option value="pending">pending</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
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
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="px-3 py-2">
                  <Link
                    href={`/internal/businesses/${p.business.id}`}
                    className="text-emerald-400 hover:underline"
                  >
                    {p.business.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.plan}</td>
                <td className="px-3 py-2">
                  {formatCurrency(Number(p.amount))}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      p.status === "success"
                        ? "text-emerald-400"
                        : p.status === "pending"
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {p.channel || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">
                  {p.reference}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(p.createdAt)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No payments match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
