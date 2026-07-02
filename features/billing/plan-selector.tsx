"use client";

import { useTransition } from "react";
import { startCheckout } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/types";
import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

interface PlanSelectorProps {
  currentPlan: SubscriptionPlan;
  status: SubscriptionStatus;
  paystackConfigured: boolean;
}

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  STARTER: 1,
  BUSINESS: 2,
  AI_PRO: 3,
};

export function PlanSelector({
  currentPlan,
  status,
  paystackConfigured,
}: PlanSelectorProps) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(planId: SubscriptionPlanId) {
    startTransition(async () => {
      const result = await startCheckout(planId);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlan && status !== "TRIAL";
        const isUpgrade = PLAN_RANK[plan.id] > PLAN_RANK[currentPlan];
        const isPopular = plan.id === "BUSINESS";

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative overflow-hidden transition-shadow",
              isPopular && "border-biz-emerald shadow-glass",
              isCurrent && "ring-2 ring-biz-blue"
            )}
          >
            {isPopular && (
              <div className="absolute top-0 right-0 bg-biz-emerald text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                POPULAR
              </div>
            )}
            {plan.id === "AI_PRO" && (
              <div className="absolute top-0 right-0 bg-biz-blue text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </div>
            )}
            <CardContent className="p-5 flex flex-col h-full">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="mt-1">
                <span className="text-2xl font-bold text-brand">
                  ₦{plan.price.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-biz-emerald shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-5"
                variant={isCurrent ? "outline" : isPopular ? "success" : "default"}
                disabled={isCurrent || isPending || !paystackConfigured}
                onClick={() => handleSelect(plan.id)}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  "Current Plan"
                ) : isUpgrade || status === "TRIAL" ? (
                  status === "TRIAL" ? "Subscribe" : "Upgrade"
                ) : (
                  "Switch Plan"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
