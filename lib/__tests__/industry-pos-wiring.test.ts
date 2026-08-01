import { describe, expect, it } from "vitest";
import { categoryPresets, posMode } from "@/lib/industries";

/**
 * Guards the two decisions the POS and inventory screens now take from the
 * industry pack, so a future pack edit can't silently change what a shop sees.
 */
describe("category presets offered on the product form", () => {
  it("offers a pharmacy words a pharmacist files stock under", () => {
    const presets = categoryPresets("PHARMACY");
    expect(presets).toContain("Antimalarials");
    expect(presets).toContain("Analgesics");
    expect(presets).not.toContain("Rice");
  });

  it("does not offer a boutique the kitchen's categories", () => {
    const presets = categoryPresets("FASHION");
    expect(presets).toContain("Footwear");
    expect(presets).not.toContain("Proteins");
  });

  it("leads every list with Favorites, which the form then drops", () => {
    // The form filters Favorites out: it is a POS view, not a shelf.
    for (const industry of ["PHARMACY", "RETAIL", "FASHION", "ELECTRONICS"]) {
      const presets = categoryPresets(industry);
      expect(presets[0]).toBe("Favorites");
      expect(presets.slice(1).length).toBeGreaterThan(2);
    }
  });
});

describe("which checkout surface a trade opens", () => {
  it("puts the scanner first where stock carries barcodes", () => {
    expect(posMode("PHARMACY")).toBe("scan_first");
    expect(posMode("ELECTRONICS")).toBe("scan_first");
  });

  it("keeps search first where stock is named, not scanned", () => {
    expect(posMode("RETAIL")).toBe("standard");
    expect(posMode("FASHION")).toBe("standard");
  });

  it("sends food service to the rush surface instead", () => {
    expect(posMode("RESTAURANT")).toBe("rush");
    expect(posMode("FAST_FOOD")).toBe("rush");
  });

  it("falls back to search-first when the trade is unknown", () => {
    expect(posMode(null)).toBe("standard");
    expect(posMode("NOT_A_TRADE")).toBe("standard");
  });
});
