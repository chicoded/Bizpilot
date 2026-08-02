/**
 * Deliberately no `@zxing/library` import.
 *
 * BarcodeFormat is a numeric enum, but importing it drags the entire decoder
 * into any bundle that touches this file — and POS, inventory and the barcode
 * API route all do. The camera scanner is already lazy-loaded, so that was a
 * few hundred kilobytes of decoder shipped to every cashier who never opens
 * the camera, on the phones least able to afford it.
 *
 * The numbers below are ZXing's own enum ordering. They are pinned by a test
 * that compares them against the real library, which is free to import there:
 * tests run in Node and are never bundled.
 */
const BARCODE_FORMAT_NAMES: Record<number, string> = {
  0: "AZTEC",
  1: "CODABAR",
  2: "CODE_39",
  3: "CODE_93",
  4: "CODE_128",
  5: "DATA_MATRIX",
  6: "EAN_8",
  7: "EAN_13",
  8: "ITF",
  9: "MAXICODE",
  10: "PDF_417",
  11: "QR_CODE",
  12: "RSS_14",
  13: "RSS_EXPANDED",
  14: "UPC_A",
  15: "UPC_E",
  16: "UPC_EAN_EXTENSION",
  17: "MICRO_QR_CODE",
};

/** The only formats a Nigerian retail counter actually scans. */
export const RETAIL_FORMAT_NAMES = [
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "CODE_128",
] as const;

const RETAIL_FORMATS = new Set<string>(RETAIL_FORMAT_NAMES);

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

export function barcodeLookupVariants(code: string): string[] {
  const trimmed = normalizeBarcode(code);
  const variants = new Set<string>([trimmed]);

  if (/^\d{13}$/.test(trimmed) && trimmed.startsWith("0")) {
    variants.add(trimmed.slice(1));
  }
  if (/^\d{12}$/.test(trimmed)) {
    variants.add(`0${trimmed}`);
  }

  return [...variants];
}

function checkDigitSum(digits: number[], weights: number[]): boolean {
  const sum = digits
    .slice(0, -1)
    .reduce(
      (total, digit, index) => total + digit * weights[index % weights.length],
      0
    );
  const expected = (10 - (sum % 10)) % 10;
  return expected === digits[digits.length - 1];
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  return checkDigitSum(digits, [1, 3]);
}

export function isValidUpcA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  return checkDigitSum(digits, [3, 1]);
}

export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  return checkDigitSum(digits, [3, 1]);
}

export function formatBarcodeType(format: unknown): string {
  if (format === undefined || format === null) return "Unknown";
  if (typeof format === "string") return format;
  if (typeof format === "number") {
    return BARCODE_FORMAT_NAMES[format] ?? `Format_${format}`;
  }
  return String(format);
}

export function isRetailBarcodeFormat(format: unknown): boolean {
  const label = formatBarcodeType(format);
  return RETAIL_FORMATS.has(label);
}

export function validateScannedBarcode(
  rawCode: string,
  format?: unknown
): { valid: boolean; normalized: string; reason?: string } {
  const normalized = normalizeBarcode(rawCode);

  if (!normalized) {
    return { valid: false, normalized, reason: "Empty barcode" };
  }

  const formatLabel = formatBarcodeType(format);

  if (format && !isRetailBarcodeFormat(format)) {
    return {
      valid: false,
      normalized,
      reason: `Unsupported format: ${formatLabel}`,
    };
  }

  if (/^\d{13}$/.test(normalized)) {
    if (!isValidEan13(normalized)) {
      return { valid: false, normalized, reason: "Invalid EAN-13 check digit" };
    }
    return { valid: true, normalized };
  }

  if (/^\d{12}$/.test(normalized)) {
    if (!isValidUpcA(normalized)) {
      return { valid: false, normalized, reason: "Invalid UPC-A check digit" };
    }
    return { valid: true, normalized };
  }

  if (/^\d{8}$/.test(normalized)) {
    if (!isValidEan8(normalized)) {
      return { valid: false, normalized, reason: "Invalid EAN-8 check digit" };
    }
    return { valid: true, normalized };
  }

  if (/^\d{6}$/.test(normalized)) {
    return { valid: true, normalized };
  }

  if (
    formatLabel === "CODE_128" &&
    /^[\x20-\x7E]{4,48}$/.test(normalized)
  ) {
    return { valid: true, normalized };
  }

  if (/^[\x20-\x7E]{4,48}$/.test(normalized) && formatLabel === "Unknown") {
    return { valid: true, normalized };
  }

  return {
    valid: false,
    normalized,
    reason: "Barcode format not recognized",
  };
}

/**
 * Exposed for the pinning test only — the numeric table above has to stay in
 * step with the library it is standing in for.
 */
export const BARCODE_FORMAT_NAMES_FOR_TEST = BARCODE_FORMAT_NAMES;
