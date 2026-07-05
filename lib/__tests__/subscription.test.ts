import { describe, expect, it } from "vitest";
import type { Subscription } from "@prisma/client";
import {
  canAccessFeature,
  isPlanUpgrade,
  isSubscriptionActive,
} from "@/lib/subscription";

function sub(
  overrides: Partial<Subscription> & Pick<Subscription, "status" | "plan">
): Subscription {
  return {
    id: "sub_1",
    businessId: "biz_1",
    plan: overrides.plan,
    status: overrides.status,
    currentPeriodEnd: overrides.currentPeriodEnd ?? new Date("2099-01-01"),
    paystackCustomerCode: null,
    paystackSubscriptionCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("subscription access", () => {
  it("treats active trial as full access", () => {
    const trial = sub({ status: "TRIAL", plan: "STARTER" });
    expect(isSubscriptionActive(trial)).toBe(true);
    expect(canAccessFeature(trial, "ai")).toBe(true);
    expect(canAccessFeature(trial, "export")).toBe(true);
  });

  it("blocks expired subscriptions", () => {
    const expired = sub({
      status: "ACTIVE",
      plan: "BUSINESS",
      currentPeriodEnd: new Date("2020-01-01"),
    });
    expect(isSubscriptionActive(expired)).toBe(false);
    expect(canAccessFeature(expired, "ai")).toBe(false);
  });

  it("gates export on starter but allows on business", () => {
    const starter = sub({ status: "ACTIVE", plan: "STARTER" });
    const business = sub({ status: "ACTIVE", plan: "BUSINESS" });
    expect(canAccessFeature(starter, "export")).toBe(false);
    expect(canAccessFeature(business, "export")).toBe(true);
  });

  it("detects plan upgrades", () => {
    expect(isPlanUpgrade("STARTER", "BUSINESS")).toBe(true);
    expect(isPlanUpgrade("BUSINESS", "STARTER")).toBe(false);
  });
});
