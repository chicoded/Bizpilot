"use client";

import { useTransition } from "react";
import { updateSupportTicketStatus } from "@/actions/internal-ops";

const STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function SupportTicketStatusSelect({
  ticketId,
  status,
  canWrite,
}: {
  ticketId: string;
  status: string;
  canWrite: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!canWrite) {
    return <span className="text-slate-300">{status.replace("_", " ")}</span>;
  }

  return (
    <select
      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number]["value"];
        startTransition(async () => {
          await updateSupportTicketStatus({ ticketId, status: next });
        });
      }}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
