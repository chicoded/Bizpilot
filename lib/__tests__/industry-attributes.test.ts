import { describe, expect, it } from "vitest";
import {
  ALL_PACKS,
  parseProductAttributes,
  productAttributeFields,
} from "@/lib/industries";
import { parseAttributes } from "@/lib/industries/attributes";

describe("attribute field declarations", () => {
  it("gives every trade uniquely named fields", () => {
    for (const pack of ALL_PACKS) {
      const names = pack.productAttributes.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("gives select fields at least two options to choose between", () => {
    for (const pack of ALL_PACKS) {
      for (const field of pack.productAttributes) {
        if (field.type === "select") {
          expect(field.options.length).toBeGreaterThan(1);
        }
      }
    }
  });

  it("declares the fields a pharmacy actually needs", () => {
    const names = productAttributeFields("PHARMACY").map((f) => f.name);
    expect(names).toContain("nafdacNumber");
    expect(names).toContain("drugSchedule");
    expect(names).toContain("requiresPrescription");
  });

  it("keeps general retail free of extra fields", () => {
    expect(productAttributeFields("RETAIL")).toEqual([]);
  });
});

describe("parsing product attributes", () => {
  it("accepts a well-formed pharmacy product", () => {
    const result = parseProductAttributes("PHARMACY", {
      nafdacNumber: "A4-1234",
      drugSchedule: "POM",
      activeIngredient: "Paracetamol 500mg",
      requiresPrescription: "on",
    });

    expect(result).toEqual({
      success: true,
      data: {
        nafdacNumber: "A4-1234",
        drugSchedule: "POM",
        activeIngredient: "Paracetamol 500mg",
        requiresPrescription: true,
      },
    });
  });

  it("treats blank optional fields as absent rather than invalid", () => {
    const result = parseProductAttributes("PHARMACY", {
      nafdacNumber: "",
      drugSchedule: "",
      activeIngredient: "Ibuprofen",
    });

    expect(result).toEqual({
      success: true,
      data: { activeIngredient: "Ibuprofen" },
    });
  });

  it("rejects a schedule that is not on the list", () => {
    const result = parseProductAttributes("PHARMACY", {
      drugSchedule: "WHATEVER",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.drugSchedule).toBeTruthy();
    }
  });

  it("reports errors keyed by field so a form can show them inline", () => {
    const result = parseProductAttributes("ELECTRONICS", {
      warrantyMonths: "not-a-number",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors)).toEqual(["warrantyMonths"]);
    }
  });

  it("drops unknown keys instead of storing them", () => {
    // Guards the JSON column against a crafted payload smuggling data in.
    const result = parseProductAttributes("PHARMACY", {
      activeIngredient: "Vitamin C",
      isAdmin: true,
      businessId: "someone_elses_shop",
    });

    expect(result).toEqual({
      success: true,
      data: { activeIngredient: "Vitamin C" },
    });
  });

  it("returns empty for trades that declare no fields", () => {
    expect(parseProductAttributes("RETAIL", { anything: "here" })).toEqual({
      success: true,
      data: {},
    });
  });

  it("survives junk input without throwing", () => {
    for (const junk of [null, undefined, "string", 42, []]) {
      expect(parseProductAttributes("PHARMACY", junk).success).toBe(true);
    }
  });

  it("coerces numbers arriving as strings from form posts", () => {
    const result = parseProductAttributes("ELECTRONICS", {
      warrantyMonths: "24",
    });

    expect(result).toEqual({ success: true, data: { warrantyMonths: 24 } });
  });

  it("reads an unchecked checkbox as false, not as true", () => {
    const result = parseProductAttributes("FASHION", {});
    expect(result.success).toBe(true);

    const spicy = parseProductAttributes("RESTAURANT", { isSpicy: "false" });
    expect(spicy).toEqual({ success: true, data: { isSpicy: false } });
  });
});

describe("required fields", () => {
  it("enforces a field a pack marks required", () => {
    const fields = [
      { name: "code", label: "Code", type: "text", required: true },
    ] as const;

    expect(parseAttributes(fields, {}).success).toBe(false);
    expect(parseAttributes(fields, { code: "X1" })).toEqual({
      success: true,
      data: { code: "X1" },
    });
  });
});
