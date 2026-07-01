import { requirePageAccess } from "@/lib/auth";
import { getBillingData } from "@/actions/billing";
import { getAppUrl } from "@/lib/env";
import { SettingsShell } from "@/components/layout/settings-shell";
import { SubscriptionStatusCard } from "@/features/billing/subscription-status-card";
import { PlanSelector } from "@/features/billing/plan-selector";
import { PaymentHistory } from "@/features/billing/payment-history";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function BillingPage() {
  const ctx = await requirePageAccess("billing");

  const { subscription, paystackConfigured } = await getBillingData();
  const appUrl = getAppUrl();

  return (
    <SettingsShell
      title="Settings"
      subtitle="Billing & subscription"
      isOwner={ctx.role === "OWNER"}
      canAccessBilling
    >
      <div className="space-y-6">
        {!paystackConfigured && (
          <Card className="border-warning/30 bg-warning/10">
            <CardContent className="p-4 text-sm">
              Paystack is not configured. Add{" "}
              <code className="bg-background px-1 rounded">PAYSTACK_SECRET_KEY</code> and{" "}
              <code className="bg-background px-1 rounded">
                NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
              </code>{" "}
              to enable payments.
            </CardContent>
          </Card>
        )}

        <SubscriptionStatusCard subscription={subscription} />

        <div>
          <h2 className="text-lg font-semibold mb-4">Choose a plan</h2>
          <PlanSelector
            currentPlan={subscription?.plan ?? "STARTER"}
            status={subscription?.status ?? "TRIAL"}
            paystackConfigured={paystackConfigured}
          />
        </div>

        {subscription?.transactions && (
          <PaymentHistory transactions={subscription.transactions} />
        )}

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Paystack Webhook URL
            </p>
            <code className="block text-xs bg-muted p-3 rounded-lg break-all">
              {appUrl}/api/webhooks/paystack
            </code>
            <p className="text-xs text-muted-foreground">
              Add this in Paystack Dashboard → Settings → Webhooks for automatic
              renewal handling.
            </p>
            <a
              href="https://dashboard.paystack.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="mt-2">
                <ExternalLink className="h-4 w-4" />
                Open Paystack Dashboard
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </SettingsShell>
  );
}
