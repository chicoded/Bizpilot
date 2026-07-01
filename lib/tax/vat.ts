import type { VatPricingMode } from "@prisma/client";

export function calculateSaleVat(params: {
  subtotal: number;
  discount: number;
  rate: number;
  mode: VatPricingMode;
}): { tax: number; total: number; netSubtotal: number } {
  const netSubtotal = Math.max(0, params.subtotal - params.discount);

  if (params.rate <= 0 || netSubtotal <= 0) {
    return { tax: 0, total: netSubtotal, netSubtotal };
  }

  if (params.mode === "INCLUSIVE") {
    const tax = netSubtotal - netSubtotal / (1 + params.rate);
    return { tax, total: netSubtotal, netSubtotal: netSubtotal - tax };
  }

  const tax = netSubtotal * params.rate;
  return { tax, total: netSubtotal + tax, netSubtotal };
}

export function formatVatLabel(enabled: boolean): string {
  return enabled ? "VAT (estimate)" : "VAT not applicable";
}
