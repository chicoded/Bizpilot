import { describe, expect, it } from "vitest";
import {
  attributeInputName,
  collectProductAttributes,
  productAttributeFields,
  readProductAttributesFromForm,
} from "@/lib/industries";

/** Stands in for `formData.get`, returning null for absent inputs like the real thing. */
function submission(values: Record<string, unknown>) {
  return (inputName: string) =>
    inputName in values ? values[inputName] : null;
}

describe("attribute input names", () => {
  it("namespaces inputs so they cannot collide with core product fields", () => {
    expect(attributeInputName("category")).toBe("attr_category");
    expect(attributeInputName("name")).toBe("attr_name");
  });

  it("names every declared field without collision", () => {
    const names = productAttributeFields("PHARMACY").map(attributeInputName);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("attr_nafdacNumber");
  });
});

describe("collecting attributes from a submission", () => {
  it("reads only declared fields and ignores everything else", () => {
    const raw = collectProductAttributes(
      "PHARMACY",
      submission({
        attr_activeIngredient: "Paracetamol",
        attr_notDeclared: "ignored",
        name: "should not be read",
      })
    );

    expect(raw).not.toHaveProperty("notDeclared");
    expect(raw).not.toHaveProperty("name");
    expect(raw.activeIngredient).toBe("Paracetamol");
  });

  it("reads an absent checkbox as false rather than missing", () => {
    const raw = collectProductAttributes("PHARMACY", submission({}));
    expect(raw.requiresPrescription).toBe(false);
  });
});

describe("form to storage", () => {
  it("returns undefined for trades with no extra fields, leaving the column alone", () => {
    const result = readProductAttributesFromForm("RETAIL", submission({}));
    expect(result).toEqual({ success: true, attributes: undefined });
  });

  it("produces a storable object for a pharmacy product", () => {
    const result = readProductAttributesFromForm(
      "PHARMACY",
      submission({
        attr_nafdacNumber: "A4-1234",
        attr_drugSchedule: "CONTROLLED",
        attr_activeIngredient: "Codeine",
        attr_requiresPrescription: "on",
      })
    );

    expect(result).toEqual({
      success: true,
      attributes: {
        nafdacNumber: "A4-1234",
        drugSchedule: "CONTROLLED",
        activeIngredient: "Codeine",
        requiresPrescription: true,
      },
    });
  });

  it("saves fine when the pharmacist fills nothing in", () => {
    const result = readProductAttributesFromForm("PHARMACY", submission({}));

    expect(result).toEqual({
      success: true,
      attributes: { requiresPrescription: false },
    });
  });

  it("reports a readable message naming the field that failed", () => {
    const result = readProductAttributesFromForm(
      "PHARMACY",
      submission({ attr_nafdacNumber: "!!!not-valid!!!" })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("NAFDAC number");
      expect(result.errors).toHaveProperty("nafdacNumber");
    }
  });

  it("accepts real-shaped NAFDAC numbers", () => {
    for (const value of ["A4-1234", "04-4567", "B12/34567", "A41234"]) {
      const result = readProductAttributesFromForm(
        "PHARMACY",
        submission({ attr_nafdacNumber: value })
      );
      expect(result.success, `${value} should be accepted`).toBe(true);
    }
  });

  it("coerces electronics warranty from its string form field", () => {
    const result = readProductAttributesFromForm(
      "ELECTRONICS",
      submission({ attr_warrantyMonths: "24", attr_brand: "Hisense" })
    );

    expect(result).toEqual({
      success: true,
      attributes: { warrantyMonths: 24, brand: "Hisense" },
    });
  });

  it("rejects a warranty outside the allowed range", () => {
    const result = readProductAttributesFromForm(
      "ELECTRONICS",
      submission({ attr_warrantyMonths: "999" })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("Warranty");
    }
  });
});
