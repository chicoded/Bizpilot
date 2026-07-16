import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { canInternal } from "@/lib/internal/permissions";
import { formatDate } from "@/lib/utils";
import { SupportTicketStatusSelect } from "@/components/internal/support-ticket-status-select";

export default async function InternalSupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await requireInternalAdmin("support:view");
  const params = searchParams ? await searchParams : {};
  const q = params.q?.trim() ?? "";
  const statusFilter = params.status?.trim() || undefined;

  let tickets: Awaited<ReturnType<typeof loadTickets>> = [];
  let loadError: string | null = null;

  try {
    tickets = await loadTickets(q, statusFilter);
  } catch (error) {
    console.error("[internal/support]", error);
    loadError =
      "Support tickets table is missing. Run database/repair-support-tickets.sql in Supabase.";
  }

  const canWrite = canInternal(admin.role, "support:write");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Support tickets</h1>
          <p className="text-sm text-slate-400">
            Bug reports submitted in-app. Update status as you handle each one.
          </p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search summary, email, business"
            className="min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
          >
            Filter
          </button>
        </form>
      </div>

      {loadError && (
        <p className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {loadError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Summary</th>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loadError && tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No support tickets yet. Customer reports from{" "}
                  <span className="text-slate-300">Settings → Help & support</span>{" "}
                  (Submit report) appear here.
                </td>
              </tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-slate-800 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {formatDate(t.createdAt)}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-100">{t.summary}</p>
                  {t.details && (
                    <p className="mt-1 max-w-md whitespace-pre-wrap text-xs text-slate-400">
                      {t.details}
                    </p>
                  )}
                  {t.pageUrl && (
                    <p className="mt-1 truncate text-xs text-slate-600">
                      {t.pageUrl}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {t.business ? (
                    <Link
                      href={`/internal/businesses/${t.business.id}`}
                      className="text-emerald-400 hover:underline"
                    >
                      {t.business.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {t.business?.phone ? (
                    <p className="mt-1 text-xs">
                      <a
                        href={`tel:${t.business.phone.replace(/\s+/g, "")}`}
                        className="text-slate-400 hover:text-emerald-400"
                      >
                        {t.business.phone}
                      </a>
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {t.email || t.user?.email || "—"}
                </td>
                <td className="px-3 py-2">
                  <SupportTicketStatusSelect
                    ticketId={t.id}
                    status={t.status}
                    canWrite={canWrite}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function loadTickets(q: string, statusFilter?: string) {
  return prisma.supportTicket.findMany({
    where: {
      ...(statusFilter
        ? {
            status: statusFilter as
              | "OPEN"
              | "IN_PROGRESS"
              | "RESOLVED"
              | "CLOSED",
          }
        : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: "insensitive" } },
              { details: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              {
                business: {
                  name: { contains: q, mode: "insensitive" },
                },
              },
              {
                user: {
                  email: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      business: { select: { id: true, name: true, phone: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
}
