import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireInternalAdmin } from "@/lib/internal/auth";
import { canInternal } from "@/lib/internal/permissions";
import { BusinessActions } from "@/components/internal/business-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InternalBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireInternalAdmin("businesses:view");
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      subscription: true,
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      paymentTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: {
          products: true,
          customers: true,
          sales: true,
          expenses: true,
        },
      },
    },
  });

  if (!business) notFound();

  const aiUsage = await prisma.aiPromptLog.count({
    where: { businessId: id },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/internal/businesses" className="text-xs text-slate-500 hover:text-slate-300">
          ← Businesses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{business.name}</h1>
        <p className="text-sm text-slate-400">
          {business.industry} · {business.currency} · created{" "}
          {formatDate(business.createdAt)}
        </p>
      </div>

      <BusinessActions
        businessId={business.id}
        suspended={Boolean(business.suspendedAt)}
        canWrite={canInternal(admin.role, "businesses:write")}
        canDelete={canInternal(admin.role, "businesses:delete")}
        canEditSubscription={canInternal(admin.role, "subscriptions:write")}
        currentPlan={business.subscription?.plan ?? "STARTER"}
        currentStatus={business.subscription?.status ?? "TRIAL"}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Products", business._count.products],
          ["Customers", business._count.customers],
          ["Sales", business._count.sales],
          ["AI prompts", aiUsage],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="font-medium text-white">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Phone</dt><dd>{business.phone || "—"}</dd></div>
          <div><dt className="text-slate-500">Address</dt><dd>{business.address || "—"}</dd></div>
          <div>
            <dt className="text-slate-500">Subscription</dt>
            <dd>
              {business.subscription?.plan ?? "—"} / {business.subscription?.status ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Period end</dt>
            <dd>
              {business.subscription?.currentPeriodEnd
                ? formatDate(business.subscription.currentPeriodEnd)
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="font-medium text-white">Team</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {business.memberships.map((m) => (
            <li key={m.id} className="flex justify-between border-b border-slate-800/80 py-2">
              <span>
                {m.user.email}
                <span className="ml-2 text-xs text-slate-500">{m.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="font-medium text-white">Recent payments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {business.paymentTransactions.length === 0 && (
            <li className="text-slate-500">No payments</li>
          )}
          {business.paymentTransactions.map((tx) => (
            <li key={tx.id} className="flex justify-between border-b border-slate-800/80 py-2">
              <span>
                {tx.plan} · {tx.status}
                <span className="ml-2 text-xs text-slate-500">{tx.reference}</span>
              </span>
              <span>{formatCurrency(Number(tx.amount))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
