import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatDate } from "@/lib/utils";

export default async function InternalUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  await requireInternalAdmin("users:view");
  const params = searchParams ? await searchParams : {};
  const q = params.q?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      memberships: {
        include: { business: { select: { id: true, name: true } } },
        take: 5,
      },
      internalAdmin: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-slate-400">Platform user accounts</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email or name"
            className="w-full min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Businesses</th>
              <th className="px-3 py-2">Staff role</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-100">{u.email}</p>
                  <p className="text-xs text-slate-500">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                  </p>
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {u.memberships.length === 0
                    ? "—"
                    : u.memberships
                        .map((m) => `${m.business.name} (${m.role})`)
                        .join(", ")}
                </td>
                <td className="px-3 py-2 text-emerald-400">
                  {u.internalAdmin && !u.internalAdmin.disabled
                    ? u.internalAdmin.role
                    : "—"}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
