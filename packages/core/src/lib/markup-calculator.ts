/**
 * Parts markup — sliding scale based on cost.
 * Standard MRO industry practice.
 */
export function getMarkupPct(unitCost: number): number {
  if (unitCost < 25)    return 1.00;   // 100%
  if (unitCost < 500)   return 0.75;   // 75%
  if (unitCost < 5000)  return 0.40;   // 40%
  return 0.25;                          // 25%
}

export function getBillPrice(unitCost: number, markupPct?: number): number {
  const markup = markupPct ?? getMarkupPct(unitCost);
  return unitCost * (1 + markup);
}

export function getPartsMargin(cost: number, billPrice: number): number {
  if (billPrice <= 0) return 0;
  return (billPrice - cost) / billPrice;
}
