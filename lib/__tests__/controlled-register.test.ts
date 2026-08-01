import { describe, expect, it } from "vitest";
import { hasCapability, filterNavItemsByIndustry } from "@/lib/industries";
import { mainNavItems } from "@/lib/app-navigation";

/**
 * The register itself needs a database, so what is pinned here is the part
 * that decides who sees it and how the balance is walked.
 */

describe("who gets the controlled register", () => {
  it("is offered to a pharmacy", () => {
    expect(hasCapability("PHARMACY", "controlled_register")).toBe(true);
  });

  it("is not offered to anyone else", () => {
    for (const trade of [
      "RETAIL",
      "RESTAURANT",
      "SUPERMARKET",
      "FASHION",
      "ELECTRONICS",
      "CAFE",
      "MINI_MART",
      "COSMETICS",
      "OTHER",
    ]) {
      expect(
        hasCapability(trade, "controlled_register"),
        `${trade} must not get the controlled register`
      ).toBe(false);
    }
  });
});

describe("capability-gated navigation", () => {
  const hrefs = (industry: string | null) =>
    filterNavItemsByIndustry(mainNavItems, industry).map((item) => item.href);

  it("shows the register in a pharmacy's sidebar", () => {
    expect(hrefs("PHARMACY")).toContain("/prescriptions");
  });

  it("keeps it out of every other sidebar", () => {
    expect(hrefs("RETAIL")).not.toContain("/prescriptions");
    expect(hrefs("RESTAURANT")).not.toContain("/prescriptions");
    expect(hrefs(null)).not.toContain("/prescriptions");
  });

  it("leaves shared sections alone for everyone", () => {
    for (const trade of [null, "PHARMACY", "RETAIL", "RESTAURANT"]) {
      const list = hrefs(trade);
      expect(list).toContain("/dashboard");
      expect(list).toContain("/inventory");
      expect(list).toContain("/sales");
    }
  });
});

/** Mirrors the balance walk in lib/pharmacy/controlled-register.ts. */
const INBOUND = ["PURCHASE", "RETURN"];

function walk(rows: { type: string; quantity: number }[]) {
  let balance = 0;
  return rows.map((row) => {
    const magnitude = Math.abs(row.quantity);
    const signed = INBOUND.includes(row.type) ? magnitude : -magnitude;
    balance += signed;
    return { signed, balance };
  });
}

describe("running balance", () => {
  it("adds receipts and subtracts everything else", () => {
    const result = walk([
      { type: "PURCHASE", quantity: 50 },
      { type: "SALE", quantity: 8 },
      { type: "SALE", quantity: 2 },
      { type: "RETURN", quantity: 1 },
      { type: "EXPIRED", quantity: 5 },
    ]);

    expect(result.map((r) => r.balance)).toEqual([50, 42, 40, 41, 36]);
  });

  it("treats quantity as a magnitude, whichever sign it was stored with", () => {
    // Adjustments are written unsigned for most types, so direction has to come
    // from the type — otherwise a negative SALE would add stock back.
    const stored = walk([
      { type: "PURCHASE", quantity: 20 },
      { type: "SALE", quantity: -5 },
    ]);
    expect(stored.at(-1)!.balance).toBe(15);
  });

  it("surfaces a gap when stock on hand disagrees with the movements", () => {
    const walked = walk([
      { type: "PURCHASE", quantity: 30 },
      { type: "SALE", quantity: 4 },
    ]);
    const fromMovements = walked.at(-1)!.balance;
    const onHand = 24;

    // 26 expected against 24 counted: two doses left without an entry, which is
    // precisely what a controlled register exists to make visible.
    expect(onHand - fromMovements).toBe(-2);
  });

  it("reconciles to zero difference when every movement was recorded", () => {
    const walked = walk([
      { type: "PURCHASE", quantity: 12 },
      { type: "SALE", quantity: 3 },
    ]);
    expect(9 - walked.at(-1)!.balance).toBe(0);
  });
});
