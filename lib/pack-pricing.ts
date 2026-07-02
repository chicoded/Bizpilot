/** Round money to 2 decimal places. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse a money text field; empty input becomes 0. */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned || cleaned === ".") return 0;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundMoney(n);
}

/** Format a number for display in an input (empty when zero on new forms). */
export function formatMoneyInput(value: number, showZero = false): string {
  if (!showZero && value === 0) return "";
  return String(value);
}

export function unitPriceFromPack(packPrice: number, unitsPerPack: number): number {
  if (unitsPerPack < 1) return roundMoney(packPrice);
  return roundMoney(packPrice / unitsPerPack);
}

export function packPriceFromUnit(unitPrice: number, unitsPerPack: number): number {
  if (unitsPerPack < 1) return roundMoney(unitPrice);
  return roundMoney(unitPrice * unitsPerPack);
}
