"use client";

import { useState, useTransition } from "react";
import type { InternalAdminRole } from "@prisma/client";
import {
  grantInternalAdmin,
  setInternalAdminDisabled,
  updateInternalAdminRole,
} from "@/actions/internal-ops";

const ROLES: InternalAdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "FINANCE",
  "DEVELOPER",
];

type StaffRow = {
  id: string;
  role: InternalAdminRole;
  disabled: boolean;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
};

export function StaffAdminPanel({
  staff,
  currentUserId,
}: {
  staff: StaffRow[];
  currentUserId: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <form
        className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
        action={(fd) => {
          start(async () => {
            setMessage(null);
            const result = await grantInternalAdmin({
              email: String(fd.get("email") ?? ""),
              role: fd.get("role") as InternalAdminRole,
            });
            setMessage(
              result.ok
                ? "Staff access granted."
                : result.error ?? "Could not grant access."
            );
          });
        }}
      >
        <h2 className="text-sm font-semibold text-white">Grant staff access</h2>
        <p className="text-xs text-slate-500">
          User must already have signed into Zaplex once (Clerk → users table).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="staff@company.com"
            className="min-w-[220px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <select
            name="role"
            defaultValue="SUPPORT"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Grant access
          </button>
        </div>
        {message && (
          <p className="text-xs text-slate-300" role="status">
            {message}
          </p>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => {
              const isSelf = row.userId === currentUserId;
              return (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-100">{row.email}</p>
                    <p className="text-xs text-slate-500">{row.name}</p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={row.role}
                      disabled={pending || isSelf}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      onChange={(e) => {
                        const role = e.target.value as InternalAdminRole;
                        start(async () => {
                          const result = await updateInternalAdminRole({
                            adminId: row.id,
                            role,
                          });
                          if (!result.ok) {
                            setMessage(result.error ?? "Update failed");
                            e.target.value = row.role;
                          }
                        });
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.disabled ? "text-red-400" : "text-emerald-400"
                      }
                    >
                      {row.disabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={pending || isSelf}
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900 disabled:opacity-40"
                      onClick={() =>
                        start(async () => {
                          const result = await setInternalAdminDisabled({
                            adminId: row.id,
                            disabled: !row.disabled,
                          });
                          if (!result.ok) {
                            setMessage(result.error ?? "Update failed");
                          }
                        })
                      }
                    >
                      {row.disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No staff rows yet. Grant access above or use
                  INTERNAL_ADMIN_EMAILS bootstrap.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
