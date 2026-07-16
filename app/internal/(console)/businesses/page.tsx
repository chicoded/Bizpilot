import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatDate } from "@/lib/utils";
import { industryDisplayName } from "@/types";

export default async function InternalBusinessesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  await requireInternalAdmin("businesses:view");
  const params = searchParams ? await searchParams : {};
  const q = params.q?.trim() ?? "";

  const businesses = await prisma.business.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            {
              memberships: {
                some: {
                  role: "OWNER",
                  user: { email: { contains: q, mode: "insensitive" } },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      subscription: true,
      memberships: {
        where: { role: "OWNER" },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        take: 1,
      },
      _count: {
        select: { products: true, customers: true, memberships: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Businesses</h1>
          <p className="text-sm text-slate-400">All tenant accounts</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, owner email"
            className="w-full min-w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Counts</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => {
              const owner = b.memberships[0]?.user;
              return (
                <tr key={b.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <Link
                      href={`/internal/businesses/${b.id}`}
                      className="font-medium text-emerald-400 hover:underline"
                    >
                      {b.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {industryDisplayName(b.industry, b.industryLabel)}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {b.phone ? (
                      <a
                        href={`tel:${b.phone.replace(/\s+/g, "")}`}
                        className="text-slate-200 hover:text-emerald-400"
                      >
                        {b.phone}
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {owner?.email ?? "—"}
                  </td>
                  <td className="px-3 py-2">{b.subscription?.plan ?? "—"}</td>
                  <td className="px-3 py-2">
                    {b.suspendedAt ? (
                      <span className="text-amber-400">Suspended</span>
                    ) : (
                      <span className="text-emerald-400">
                        {b.subscription?.status ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {b._count.products}p · {b._count.customers}c ·{" "}
                    {b._count.memberships}u
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatDate(b.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
