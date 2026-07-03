import { normalizeBarcode } from "@/lib/barcode";

export interface BarcodeProductHit {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  barcode?: string | null;
}

export type BarcodeLookupResult =
  | { ok: true; product: BarcodeProductHit }
  | { ok: false; reason: "not_found" | "out_of_stock" | "network" | "server"; message: string };

export async function lookupProductByBarcode(
  rawCode: string
): Promise<BarcodeLookupResult> {
  const normalized = normalizeBarcode(rawCode);
  if (normalized.length < 4) {
    return {
      ok: false,
      reason: "not_found",
      message: "Barcode too short.",
    };
  }

  try {
    const response = await fetch(
      `/api/products/barcode?code=${encodeURIComponent(normalized)}`
    );

    if (!response.ok) {
      return {
        ok: false,
        reason: "server",
        message: "Could not look up product. Try again.",
      };
    }

    const data = (await response.json()) as {
      product: BarcodeProductHit | null;
    };

    if (!data.product) {
      return {
        ok: false,
        reason: "not_found",
        message: normalized,
      };
    }

    if (data.product.quantity <= 0) {
      return {
        ok: false,
        reason: "out_of_stock",
        message: `${data.product.name} is out of stock.`,
      };
    }

    return { ok: true, product: data.product };
  } catch {
    return {
      ok: false,
      reason: "network",
      message: "Network error. Check your connection.",
    };
  }
}

export function looksLikeBarcode(value: string): boolean {
  const normalized = normalizeBarcode(value);
  if (normalized.length < 4 || normalized.length > 48) return false;
  return /^[\dA-Za-z\-]+$/.test(normalized);
}
