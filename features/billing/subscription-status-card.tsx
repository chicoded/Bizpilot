import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  formatSubscriptionStatus,
  getDaysRemaining,
  isSubscriptionActive,
  getPlanDetails,
} from "@/lib/subscription";
import type { Subscription } from "@prisma/client";
import { CreditCard, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  TRIAL: "bg-blue-100 text-blue-700",
  PAST_DUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export function SubscriptionStatusCard({
  subscription,
}: SubscriptionStatusCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No subscription found
        </CardContent>
      </Card>
    );
  }

  const plan = getPlanDetails(subscription.plan);
  const daysLeft = getDaysRemaining(subscription);
  const active = isSubscriptionActive(subscription);

  return (
    <Card className="bg-gradient-to-br from-biz-blue/5 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Current Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-biz-blue">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              ₦{plan.price.toLocaleString()}/month
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              statusColors[subscription.status]
            )}
          >
            {formatSubscriptionStatus(subscription.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              {subscription.status === "TRIAL" ? "Trial ends" : "Renews"}
            </div>
            <p className="text-sm font-semibold">
              {subscription.currentPeriodEnd
                ? formatDate(subscription.currentPeriodEnd)
                : "—"}
            </p>
            {daysLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
              </p>
            )}
          </div>
          <div className="rounded-xl bg-white border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Shield className="h-3.5 w-3.5" />
              Access
            </div>
            <p className="text-sm font-semibold">
              {active ? "Full access" : "Limited"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
