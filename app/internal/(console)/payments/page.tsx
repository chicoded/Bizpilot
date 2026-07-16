import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InternalPaymentsPage() {
  await requireInternalAdmin("payments:view");

  const payments = await prisma.paymentTransaction.findMany({
    include: {
      business: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-sm text-slate-400">Recent Flutterwave / billing transactions</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
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
                <td className="px-3 py-2">{formatCurrency(Number(p.amount))}</td>
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
                <td className="px-3 py-2 font-mono text-xs text-slate-500">
                  {p.reference}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
