"use client";

import { useTransition } from "react";
import {
  activateBusiness,
  deleteBusiness,
  extendBusinessTrial,
  suspendBusiness,
  updateBusinessSubscription,
} from "@/actions/internal-ops";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export function BusinessActions({
  businessId,
  suspended,
  canWrite,
  canDelete,
  canEditSubscription,
  currentPlan,
  currentStatus,
}: {
  businessId: string;
  suspended: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canEditSubscription: boolean;
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {suspended ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  await activateBusiness(businessId);
                })
              }
            >
              Activate
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  await suspendBusiness(businessId);
                })
              }
            >
              Suspend
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  if (
                    !confirm(
                      "Permanently delete this business and all data?"
                    )
                  ) {
                    return;
                  }
                  await deleteBusiness(businessId);
                  window.location.href = "/internal/businesses";
                })
              }
            >
              Delete
            </button>
          )}
        </div>
      )}

      {canEditSubscription && (
        <>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                disabled={pending}
                className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300 disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    await extendBusinessTrial({ businessId, days });
                  })
                }
              >
                Extend trial +{days}d
              </button>
            ))}
          </div>

          <form
            className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
            action={(fd) => {
              start(async () => {
                await updateBusinessSubscription({
                  businessId,
                  plan: fd.get("plan") as SubscriptionPlan,
                  status: fd.get("status") as SubscriptionStatus,
                  periodDays: Number(fd.get("periodDays") || 30),
                });
              });
            }}
          >
            <label className="text-xs text-slate-400">
              Plan
              <select
                name="plan"
                defaultValue={currentPlan}
                className="mt-1 block rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
              >
                <option value="STARTER">STARTER</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="AI_PRO">AI_PRO</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Status
              <select
                name="status"
                defaultValue={currentStatus}
                className="mt-1 block rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
              >
                <option value="TRIAL">TRIAL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Period days
              <input
                name="periodDays"
                type="number"
                defaultValue={30}
                min={1}
                className="mt-1 block w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
            >
              Save subscription
            </button>
          </form>
        </>
      )}
    </div>
  );
}
