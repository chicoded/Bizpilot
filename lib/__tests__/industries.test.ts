import { describe, expect, it } from "vitest";
import type { Industry } from "@prisma/client";
import { INDUSTRIES } from "@/types";
import {
  ALL_PACKS,
  FALLBACK_PACK,
  categoryPresets,
  getIndustryPack,
  hasCapability,
  posMode,
} from "@/lib/industries";
import { isRushPosIndustry } from "@/lib/rush-pos/constants";

describe("industry registry coverage", () => {
  it("serves every industry the onboarding form offers", () => {
    // If someone adds an Industry enum value without a pack, this fails here
    // rather than silently falling back to retail in production.
    const covered = new Set(ALL_PACKS.flatMap((p) => p.industries));
    const missing = INDUSTRIES.map((i) => i.value).filter(
      (value) => !covered.has(value as Industry)
    );
    expect(missing).toEqual([]);
  });

  it("assigns each industry to exactly one pack", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const pack of ALL_PACKS) {
      for (const industry of pack.industries) {
        if (seen.has(industry)) duplicates.push(industry);
        seen.add(industry);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it("falls back to retail for unknown or missing industries", () => {
    expect(getIndustryPack(undefined)).toBe(FALLBACK_PACK);
    expect(getIndustryPack(null)).toBe(FALLBACK_PACK);
    expect(getIndustryPack("NOT_A_TRADE")).toBe(FALLBACK_PACK);
  });
});

describe("capabilities", () => {
  it("gives food service its kitchen features", () => {
    expect(hasCapability("RESTAURANT", "rush_pos")).toBe(true);
    expect(hasCapability("FAST_FOOD", "kitchen_display")).toBe(true);
    expect(hasCapability("CAFE", "combo_meals")).toBe(true);
  });

  it("does not leak kitchen features into other trades", () => {
    expect(hasCapability("PHARMACY", "rush_pos")).toBe(false);
    expect(hasCapability("RETAIL", "kitchen_display")).toBe(false);
    expect(hasCapability("FASHION", "plate_builder")).toBe(false);
  });

  it("gives pharmacy its regulated-stock features", () => {
    expect(hasCapability("PHARMACY", "prescription_log")).toBe(true);
    expect(hasCapability("PHARMACY", "controlled_register")).toBe(true);
    expect(hasCapability("PHARMACY", "expiry_alerts")).toBe(true);
  });

  it("keeps regulated features out of trades that must not have them", () => {
    expect(hasCapability("RETAIL", "prescription_log")).toBe(false);
    expect(hasCapability("RESTAURANT", "controlled_register")).toBe(false);
  });
});

describe("rush POS gating is unchanged by the refactor", () => {
  // Guards the behaviour the old hardcoded RUSH_POS_INDUSTRIES list gave us.
  const foodService: Industry[] = ["RESTAURANT", "FAST_FOOD", "CAFE"];

  it.each(foodService)("still enables rush POS for %s", (industry) => {
    expect(isRushPosIndustry(industry)).toBe(true);
  });

  const others = INDUSTRIES.map((i) => i.value).filter(
    (v) => !foodService.includes(v as Industry)
  );

  it.each(others)("still leaves rush POS off for %s", (industry) => {
    expect(isRushPosIndustry(industry)).toBe(false);
  });

  it("leaves rush POS off when industry is unset", () => {
    expect(isRushPosIndustry(null)).toBe(false);
    expect(isRushPosIndustry(undefined)).toBe(false);
  });
});

describe("pack content", () => {
  it("opens the right checkout surface per trade", () => {
    expect(posMode("RESTAURANT")).toBe("rush");
    expect(posMode("PHARMACY")).toBe("scan_first");
    expect(posMode("RETAIL")).toBe("standard");
  });

  it("leads every category list with Favorites", () => {
    for (const pack of ALL_PACKS) {
      expect(pack.categoryPresets[0]).toBe("Favorites");
    }
  });

  it("gives each trade its own vocabulary", () => {
    expect(categoryPresets("PHARMACY")).toContain("Antimalarials");
    expect(categoryPresets("RESTAURANT")).toContain("Combos");
    expect(categoryPresets("FASHION")).toContain("Footwear");
  });
});
