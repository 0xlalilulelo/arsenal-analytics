/**
 * Labor rate utilities.
 * AOG-specific calculations moved to aog-billing.ts.
 * Re-exported here for backward compatibility.
 */
export {
  AOG_MULTIPLIER,
  SHOP_SUPPLIES_DEFAULT_PCT,
  CUSTOMER_SUPPLIED_PARTS_FEE_PCT,
  getAogRate,
  getShopSuppliesCharge,
  getCustomerSuppliedPartsHandlingFee,
  roundToQuarterHour,
} from './aog-billing';

/**
 * Estimate variance — flags jobs that deviate significantly from quoted total.
 * Triggers re-authorization request at >30% overage (MRO industry standard).
 */
export const REAUTH_VARIANCE_THRESHOLD = 0.30;

export function getEstimateVariancePct(
  quotedTotal: number,
  actualTotal: number,
): number {
  if (quotedTotal <= 0) return 0;
  return (actualTotal - quotedTotal) / quotedTotal;
}

export function requiresReauthorization(
  quotedTotal: number,
  actualTotal: number,
  threshold = REAUTH_VARIANCE_THRESHOLD,
): boolean {
  return getEstimateVariancePct(quotedTotal, actualTotal) > threshold;
}

/**
 * Compute consumables (shop supplies) charge as % of labor.
 */
export function computeShopSupplies(
  laborTotal: number,
  pct: number,
): number {
  return laborTotal * pct;
}

/**
 * Build a WO financial summary from raw actuals.
 */
export interface WOFinancialSummary {
  totalLaborBilled: number;
  totalPartsBilled: number;
  shopSupplies: number;
  subtotal: number;
  laborCost: number;
  partsCost: number;
  grossProfit: number;
  grossMarginPct: number;
}

export function buildWOFinancialSummary(input: {
  laborEntries: Array<{ hours: number; rateUsed: number; billable: boolean }>;
  partRequests: Array<{ qty: number; unitCost: number | null; unitBillPrice: number | null }>;
  shopSuppliesPct: number;
  technicianCostRates: Record<string, number>;
  laborEntriesTechIds: Array<{ technicianId: string; hours: number; billable: boolean }>;
}): WOFinancialSummary {
  const totalLaborBilled = input.laborEntries
    .filter(e => e.billable)
    .reduce((s, e) => s + e.hours * e.rateUsed, 0);

  const totalPartsBilled = input.partRequests.reduce(
    (s, p) => s + p.qty * (p.unitBillPrice ?? 0),
    0,
  );

  const shopSupplies = totalLaborBilled * input.shopSuppliesPct;
  const subtotal = totalLaborBilled + totalPartsBilled + shopSupplies;

  const laborCost = input.laborEntriesTechIds.reduce((s, e) => {
    const costRate = input.technicianCostRates[e.technicianId] ?? 0;
    return s + e.hours * costRate;
  }, 0);

  const partsCost = input.partRequests.reduce(
    (s, p) => s + p.qty * (p.unitCost ?? 0),
    0,
  );

  const grossProfit = subtotal - laborCost - partsCost;
  const grossMarginPct = subtotal > 0 ? grossProfit / subtotal : 0;

  return {
    totalLaborBilled,
    totalPartsBilled,
    shopSupplies,
    subtotal,
    laborCost,
    partsCost,
    grossProfit,
    grossMarginPct,
  };
}
