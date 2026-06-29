import type { Subscription, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import {
  SUBSCRIPTION_PLANS,
  type PlanFeature,
  type SubscriptionPlanId,
} from "@/types";

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  STARTER: 1,
  BUSINESS: 2,
  AI_PRO: 3,
};

export function getPlanDetails(planId: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId)!;
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "ACTIVE" || subscription.status === "TRIAL") {
    if (!subscription.currentPeriodEnd) return subscription.status === "TRIAL";
    return subscription.currentPeriodEnd > new Date();
  }
  return false;
}

export function getDaysRemaining(subscription: Subscription | null): number {
  if (!subscription?.currentPeriodEnd) return 0;
  const diff = subscription.currentPeriodEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function planHasFeature(
  plan: SubscriptionPlan,
  feature: PlanFeature
): boolean {
  const details = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
  return details?.highlights.includes(feature) ?? false;
}

export function canAccessFeature(
  subscription: Subscription | null,
  feature: PlanFeature
): boolean {
  if (!isSubscriptionActive(subscription)) return false;
  if (!subscription) return false;
  // Full platform access during free trial
  if (subscription.status === "TRIAL") return true;
  return planHasFeature(subscription.plan, feature);
}

export function isPlanUpgrade(
  current: SubscriptionPlan,
  target: SubscriptionPlan
): boolean {
  return PLAN_RANK[target] > PLAN_RANK[current];
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    ACTIVE: "Active",
    TRIAL: "Free Trial",
    PAST_DUE: "Past Due",
    CANCELLED: "Cancelled",
  };
  return labels[status];
}

export function getRequiredPlanForFeature(feature: PlanFeature): SubscriptionPlanId {
  for (const plan of SUBSCRIPTION_PLANS) {
    if (plan.highlights.includes(feature)) {
      return plan.id;
    }
  }
  return "AI_PRO";
}
