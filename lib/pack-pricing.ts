/** Round money to 2 decimal places. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function unitPriceFromPack(packPrice: number, unitsPerPack: number): number {
  if (unitsPerPack < 1) return roundMoney(packPrice);
  return roundMoney(packPrice / unitsPerPack);
}

export function packPriceFromUnit(unitPrice: number, unitsPerPack: number): number {
  if (unitsPerPack < 1) return roundMoney(unitPrice);
  return roundMoney(unitPrice * unitsPerPack);
}
