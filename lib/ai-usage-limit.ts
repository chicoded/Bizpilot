import { subDays, subHours } from "date-fns";
import type { Subscription, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isSubscriptionActive } from "@/lib/subscription";

export type AiLimitTier = "trial" | "starter" | "business" | "ai_pro";

export interface AiPromptUsage {
  tier: AiLimitTier;
  tierLabel: string;
  isLimited: boolean;
  dailyLimit: number;
  hourlyLimit: number;
  dailyUsed: number;
  hourlyUsed: number;
  dailyRemaining: number;
  resetsAt: Date;
}

export interface AiPromptLimitCheck {
  allowed: boolean;
  message?: string;
  usage: AiPromptUsage;
}

const TIER_LABELS: Record<AiLimitTier, string> = {
  trial: "Free trial",
  starter: "Starter",
  business: "Business",
  ai_pro: "AI Pro",
};

const DEFAULT_LIMITS: Record<AiLimitTier, { daily: number; hourly: number }> = {
  trial: { daily: 25, hourly: 8 },
  starter: { daily: 60, hourly: 15 },
  business: { daily: 200, hourly: 50 },
  ai_pro: { daily: 500, hourly: 120 },
};

function envLimit(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getLimitsForTier(tier: AiLimitTier) {
  const defaults = DEFAULT_LIMITS[tier];
  const prefix = tier === "trial" ? "TRIAL" : `PAID_${tier.toUpperCase()}`;
  return {
    dailyLimit: envLimit(`${prefix}_AI_DAILY_LIMIT`, defaults.daily),
    hourlyLimit: envLimit(`${prefix}_AI_HOURLY_LIMIT`, defaults.hourly),
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function endOfUtcDay(date: Date): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function getAiLimitTier(
  subscription: Subscription | null | undefined
): AiLimitTier | null {
  if (!subscription || !isSubscriptionActive(subscription)) return null;
  if (subscription.status === "TRIAL") return "trial";
  const plan = subscription.plan as SubscriptionPlan;
  if (plan === "STARTER") return "starter";
  if (plan === "BUSINESS") return "business";
  if (plan === "AI_PRO") return "ai_pro";
  return "starter";
}

export async function getAiPromptUsage(
  businessId: string,
  subscription: Subscription | null | undefined
): Promise<AiPromptUsage | null> {
  const tier = getAiLimitTier(subscription);
  if (!tier) return null;

  const { dailyLimit, hourlyLimit } = getLimitsForTier(tier);
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const hourStart = subHours(now, 1);

  const [dailyUsed, hourlyUsed] = await Promise.all([
    prisma.aiPromptLog.count({
      where: { businessId, createdAt: { gte: dayStart } },
    }),
    prisma.aiPromptLog.count({
      where: { businessId, createdAt: { gte: hourStart } },
    }),
  ]);

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    isLimited: true,
    dailyLimit,
    hourlyLimit,
    dailyUsed,
    hourlyUsed,
    dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
    resetsAt: endOfUtcDay(now),
  };
}

/** @deprecated Use getAiPromptUsage */
export const getTrialAiPromptUsage = getAiPromptUsage;

function formatResetTime(date: Date): string {
  return date.toLocaleString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function buildLimitMessage(
  usage: AiPromptUsage,
  reason: "hourly" | "daily"
): string {
  const planHint =
    usage.tier === "trial"
      ? "Subscribe at Settings → Billing for higher AI limits."
      : usage.tier === "ai_pro"
        ? "Your AI Pro daily cap protects platform costs. Limits reset automatically."
        : "Upgrade your plan at Settings → Billing for higher AI limits.";

  if (reason === "hourly") {
    return `You've reached your ${usage.tierLabel} limit of ${usage.hourlyLimit} AI messages per hour. Try again shortly. ${planHint}`;
  }

  return `You've used all ${usage.dailyLimit} AI messages for today on the ${usage.tierLabel} plan (resets ${formatResetTime(usage.resetsAt)}). ${planHint}`;
}

/** @deprecated Use buildLimitMessage */
export const buildTrialLimitMessage = buildLimitMessage;

export async function assertAiPromptAllowed(
  businessId: string,
  subscription: Subscription | null | undefined
): Promise<AiPromptLimitCheck> {
  const usage = await getAiPromptUsage(businessId, subscription);

  if (!usage) {
    return {
      allowed: true,
      usage: {
        tier: "trial",
        tierLabel: TIER_LABELS.trial,
        isLimited: false,
        dailyLimit: 0,
        hourlyLimit: 0,
        dailyUsed: 0,
        hourlyUsed: 0,
        dailyRemaining: 0,
        resetsAt: new Date(),
      },
    };
  }

  if (usage.hourlyUsed >= usage.hourlyLimit) {
    return {
      allowed: false,
      message: buildLimitMessage(usage, "hourly"),
      usage,
    };
  }

  if (usage.dailyUsed >= usage.dailyLimit) {
    return {
      allowed: false,
      message: buildLimitMessage(usage, "daily"),
      usage,
    };
  }

  return { allowed: true, usage };
}

/** @deprecated Use assertAiPromptAllowed */
export const assertTrialAiPromptAllowed = assertAiPromptAllowed;

export async function recordAiPromptUse(businessId: string): Promise<void> {
  await prisma.aiPromptLog.create({
    data: { businessId },
  });

  if (Math.random() < 0.01) {
    void prisma.aiPromptLog
      .deleteMany({
        where: { createdAt: { lt: subDays(new Date(), 8) } },
      })
      .catch(() => {});
  }
}

/** @deprecated Use recordAiPromptUse */
export const recordTrialAiPromptUse = recordAiPromptUse;

export type AiUsageContext = {
  businessId: string;
  subscription: Subscription | null;
};

export async function guardAiPrompt(
  context: AiUsageContext
): Promise<AiPromptLimitCheck> {
  const check = await assertAiPromptAllowed(
    context.businessId,
    context.subscription
  );
  if (check.allowed && check.usage.isLimited) {
    await recordAiPromptUse(context.businessId);
  }
  return check;
}

/** @deprecated Use guardAiPrompt */
export const guardTrialAiPrompt = guardAiPrompt;

/** @deprecated */
export function isTrialAiRateLimited(
  subscription: Subscription | null | undefined
): boolean {
  return getAiLimitTier(subscription) !== null;
}
