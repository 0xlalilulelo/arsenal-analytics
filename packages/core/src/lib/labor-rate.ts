/**
 * AOG rate multiplier is exactly 1.5× standard rate.
 * Consumables billed as 3.5% of total labor (industry standard).
 * Customer-supplied parts handling fee: 12.5%.
 */

export const AOG_MULTIPLIER = 1.5;
export const SHOP_SUPPLIES_DEFAULT_PCT = 0.035;
export const CUSTOMER_SUPPLIED_PARTS_FEE_PCT = 0.125;

export function getAogRate(baseRate: number): number {
  return baseRate * AOG_MULTIPLIER;
}

export function getShopSuppliesCharge(
  totalLaborCost: number,
  pct = SHOP_SUPPLIES_DEFAULT_PCT,
): number {
  return totalLaborCost * pct;
}

export function getCustomerSuppliedPartsHandlingFee(partsCost: number): number {
  return partsCost * CUSTOMER_SUPPLIED_PARTS_FEE_PCT;
}

export function roundToQuarterHour(hours: number): number {
  return Math.round(hours * 4) / 4;
}
