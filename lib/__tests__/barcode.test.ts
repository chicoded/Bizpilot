import { describe, expect, it } from "vitest";
import { barcodeLookupVariants, normalizeBarcode } from "@/lib/barcode";
import { looksLikeBarcode } from "@/lib/barcode-product-lookup";

describe("barcode utilities", () => {
  it("normalizes whitespace from scanned codes", () => {
    expect(normalizeBarcode("  1234 5678 9012 ")).toBe("123456789012");
  });

  it("generates EAN-13 lookup variants", () => {
    const withLeadingZero = barcodeLookupVariants("0123456789012");
    expect(withLeadingZero).toContain("0123456789012");
    expect(withLeadingZero).toContain("123456789012");
  });

  it("detects barcode-like search input", () => {
    expect(looksLikeBarcode("8901234567890")).toBe(true);
    expect(looksLikeBarcode("ABC-1234")).toBe(true);
    expect(looksLikeBarcode("ab")).toBe(false);
    expect(looksLikeBarcode("sale!")).toBe(false);
  });
});
