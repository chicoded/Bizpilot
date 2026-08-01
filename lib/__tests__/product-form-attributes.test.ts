import { describe, expect, it } from "vitest";
import { parseProductFormData } from "@/lib/local-data/form";

/**
 * The inventory forms save through the local-first path, not the server
 * action, so this is the parser that actually decides what reaches IndexedDB.
 */
function productForm(extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("name", "Paracetamol 500mg");
  form.set("purchasePrice", "200");
  form.set("sellingPrice", "350");
  form.set("unitsPerPack", "1");
  form.set("quantity", "10");
  form.set("reorderLevel", "5");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

describe("saving a product from the inventory form", () => {
  it("carries pharmacy fields through to the local record", async () => {
    const result = await parseProductFormData(
      productForm({
        attr_nafdacNumber: "A4-1234",
        attr_drugSchedule: "POM",
        attr_activeIngredient: "Paracetamol",
        attr_requiresPrescription: "on",
      }),
      "PHARMACY"
    );

    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.attributes).toEqual({
        nafdacNumber: "A4-1234",
        drugSchedule: "POM",
        activeIngredient: "Paracetamol",
        requiresPrescription: true,
      });
    }
  });

  it("leaves attributes off entirely for a trade with no extra fields", async () => {
    const result = await parseProductFormData(productForm(), "RETAIL");

    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.attributes).toBeUndefined();
    }
  });

  it("still saves when no industry is known, e.g. first offline load", async () => {
    const result = await parseProductFormData(productForm(), null);
    expect("data" in result).toBe(true);
  });

  it("refuses to save an invalid attribute and says which field", async () => {
    const result = await parseProductFormData(
      productForm({ attr_nafdacNumber: "###" }),
      "PHARMACY"
    );

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("NAFDAC number");
    }
  });

  it("does not let a stray attribute input reach storage", async () => {
    const result = await parseProductFormData(
      productForm({ attr_isAdmin: "true", attr_businessId: "other_shop" }),
      "PHARMACY"
    );

    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.attributes).not.toHaveProperty("isAdmin");
      expect(result.data.attributes).not.toHaveProperty("businessId");
    }
  });

  it("keeps core product fields intact alongside attributes", async () => {
    const result = await parseProductFormData(
      productForm({ attr_activeIngredient: "Ibuprofen" }),
      "PHARMACY"
    );

    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.name).toBe("Paracetamol 500mg");
      expect(result.data.sellingPrice).toBe(350);
      expect(result.data.quantity).toBe(10);
    }
  });
});
