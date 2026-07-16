import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { formatDate } from "@/lib/utils";

export default async function InternalLogsPage() {
  await requireInternalAdmin("logs:view");

  const logs = await prisma.internalAuditLog.findMany({
    include: {
      actor: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Internal audit logs</h1>
        <p className="text-sm text-slate-400">Staff actions inside Zaplex Ops</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No staff actions recorded yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-3 py-2">{log.actor?.email ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-slate-200">
                  {log.action}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {log.entity ?? "—"}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
