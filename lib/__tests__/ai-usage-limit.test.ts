import { describe, expect, it } from "vitest";
import type { Subscription } from "@prisma/client";
import {
  buildLimitMessage,
  getAiLimitTier,
} from "@/lib/ai-usage-limit";

function sub(
  status: Subscription["status"],
  plan: Subscription["plan"]
): Subscription {
  return {
    id: "sub_1",
    businessId: "biz_1",
    status,
    plan,
    currentPeriodEnd: new Date("2099-01-01"),
    paystackCustomerCode: null,
    paystackSubCode: null,
    lastPaymentReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("AI usage limits", () => {
  it("maps subscription to limit tiers", () => {
    expect(getAiLimitTier(sub("TRIAL", "STARTER"))).toBe("trial");
    expect(getAiLimitTier(sub("ACTIVE", "STARTER"))).toBe("starter");
    expect(getAiLimitTier(sub("ACTIVE", "BUSINESS"))).toBe("business");
    expect(getAiLimitTier(sub("ACTIVE", "AI_PRO"))).toBe("ai_pro");
    expect(getAiLimitTier(null)).toBeNull();
  });

  it("builds helpful daily limit messages", () => {
    const message = buildLimitMessage(
      {
        tier: "trial",
        tierLabel: "Free trial",
        isLimited: true,
        dailyLimit: 25,
        hourlyLimit: 8,
        dailyUsed: 25,
        hourlyUsed: 3,
        dailyRemaining: 0,
        resetsAt: new Date("2025-07-04T00:00:00Z"),
      },
      "daily"
    );
    expect(message).toContain("Free trial");
    expect(message).toContain("25");
    expect(message).toContain("Billing");
  });
});
