import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { getPlanDetails } from "@/lib/subscription";
import type { SubscriptionPlanId } from "@/types";

interface UpgradePromptProps {
  feature: string;
  requiredPlan: SubscriptionPlanId;
}

export function UpgradePrompt({ feature, requiredPlan }: UpgradePromptProps) {
  const plan = getPlanDetails(requiredPlan);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            {feature} requires {plan.name}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upgrade to ₦{plan.price.toLocaleString()}/month to unlock this feature.
          </p>
        </div>
        <Link href="/settings/billing">
          <Button size="sm">
            <Sparkles className="h-4 w-4" />
            Upgrade
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
