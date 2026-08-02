import { describe, expect, it } from "vitest";
import { BarcodeFormat } from "@zxing/library";
import {
  barcodeLookupVariants,
  normalizeBarcode,
  formatBarcodeType,
  RETAIL_FORMAT_NAMES,
  BARCODE_FORMAT_NAMES_FOR_TEST,
} from "@/lib/barcode";
import { looksLikeBarcode } from "@/lib/barcode-product-lookup";

/**
 * lib/barcode hardcodes ZXing's numeric enum so the decoder stays out of the
 * browser bundle. That trade is only safe while the numbers still match, and
 * a drift would be invisible at runtime — scans would just be labelled with
 * the wrong format and silently rejected as "unsupported". So assert it.
 */
describe("ZXing format table stays in step with the library", () => {
  it("maps every hardcoded number to the same name as @zxing/library", () => {
    for (const [value, name] of Object.entries(BARCODE_FORMAT_NAMES_FOR_TEST)) {
      expect(BarcodeFormat[Number(value)]).toBe(name);
    }
  });

  it("covers every format the library defines", () => {
    const libraryNames = Object.values(BarcodeFormat).filter(
      (v): v is string => typeof v === "string"
    );
    const ourNames = Object.values(BARCODE_FORMAT_NAMES_FOR_TEST);
    expect([...ourNames].sort()).toEqual([...libraryNames].sort());
  });

  it("resolves the retail formats the scanner asks for", () => {
    for (const name of RETAIL_FORMAT_NAMES) {
      expect(BarcodeFormat[name]).toBeTypeOf("number");
      expect(formatBarcodeType(BarcodeFormat[name])).toBe(name);
    }
  });
});

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
