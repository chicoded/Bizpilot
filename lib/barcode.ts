import { BarcodeFormat } from "@zxing/library";

const RETAIL_FORMATS = new Set<string>([
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "CODE_128",
]);

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
    return BarcodeFormat[format] ?? `Format_${format}`;
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

export const ZXING_RETAIL_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];
