import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { getBillingData } from "@/actions/billing";
import { SettingsShell } from "@/components/layout/settings-shell";
import { SubscriptionStatusCard } from "@/features/billing/subscription-status-card";
import { PlanSelector } from "@/features/billing/plan-selector";
import { PaymentHistory } from "@/features/billing/payment-history";
import { Card, CardContent } from "@/components/ui/card";

export default async function BillingPage() {
  const ctx = await requirePageAccess("billing");

  const { subscription, paymentsConfigured } = await getBillingData();

  return (
    <SettingsShell
      title="Settings"
      subtitle="Billing & subscription"
      isOwner={ctx.role === "OWNER"}
      canAccessBilling
    >
      <div className="space-y-6">
        {!paymentsConfigured && (
          <Card className="border-warning/30 bg-warning/10">
            <CardContent className="p-4 text-sm">
              Online payments are temporarily unavailable. Please try again later
              or{" "}
              <Link href="/settings/support" className="underline">
                contact support
              </Link>
              .
            </CardContent>
          </Card>
        )}

        <SubscriptionStatusCard subscription={subscription} />

        <div>
          <h2 className="text-lg font-semibold mb-4">Choose a plan</h2>
          <PlanSelector
            currentPlan={subscription?.plan ?? "STARTER"}
            status={subscription?.status ?? "TRIAL"}
            paymentsConfigured={paymentsConfigured}
          />
        </div>

        {subscription?.transactions && (
          <PaymentHistory transactions={subscription.transactions} />
        )}
      </div>
    </SettingsShell>
  );
}
