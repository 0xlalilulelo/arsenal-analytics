/**
 * Parts markup — sliding scale based on unit cost.
 * Supports both hardcoded default tiers and dynamic org-level MarkupRule records.
 */

export interface MarkupTier {
  label: string;
  minCost: number;
  maxCost: number | null;
  markupPct: number;
}

/** Default industry-standard tiers used when no org MarkupRules are configured. */
export const DEFAULT_MARKUP_TIERS: MarkupTier[] = [
  { label: '< $25',         minCost: 0,    maxCost: 25,    markupPct: 1.00 },  // 100%
  { label: '$25 – $500',    minCost: 25,   maxCost: 500,   markupPct: 0.75 },  // 75%
  { label: '$500 – $2,000', minCost: 500,  maxCost: 2000,  markupPct: 0.50 },  // 50%
  { label: '$2K – $5K',     minCost: 2000, maxCost: 5000,  markupPct: 0.35 },  // 35%
  { label: '> $5K',         minCost: 5000, maxCost: null,  markupPct: 0.25 },  // 25%
];

/**
 * Find the applicable markup tier for a given unit cost.
 * Uses org-level rules if provided, otherwise falls back to defaults.
 */
export function findMarkupTier(
  unitCost: number,
  orgRules?: MarkupTier[],
): MarkupTier {
  const tiers = orgRules && orgRules.length > 0 ? orgRules : DEFAULT_MARKUP_TIERS;
  const sorted = [...tiers].sort((a, b) => a.minCost - b.minCost);

  // Find the first tier where unitCost falls within [minCost, maxCost)
  // (maxCost is exclusive upper bound; null maxCost means unbounded)
  for (const tier of sorted) {
    if (unitCost >= tier.minCost && (tier.maxCost === null || unitCost < tier.maxCost)) {
      return tier;
    }
  }

  // Fallback: return the highest tier (covers edge cases like unitCost === maxCost of last tier)
  return sorted[sorted.length - 1];
}

/**
 * Get the markup percentage for a given unit cost.
 * Returns a decimal (e.g. 0.75 = 75% markup).
 */
export function getMarkupPct(unitCost: number, orgRules?: MarkupTier[]): number {
  return findMarkupTier(unitCost, orgRules).markupPct;
}

/**
 * Calculate the customer bill price for a part.
 * billPrice = unitCost × (1 + markupPct)
 */
export function getBillPrice(
  unitCost: number,
  markupPct?: number,
  orgRules?: MarkupTier[],
): number {
  const pct = markupPct ?? getMarkupPct(unitCost, orgRules);
  return unitCost * (1 + pct);
}

/**
 * Calculate gross margin % on a part sale.
 * margin = (billPrice - cost) / billPrice
 */
export function getPartsMargin(cost: number, billPrice: number): number {
  if (billPrice <= 0) return 0;
  return (billPrice - cost) / billPrice;
}

export interface MarkupBreakdown {
  unitCost: number;
  tierLabel: string;
  markupPct: number;
  markupAmount: number;
  billPrice: number;
  marginPct: number;
}

/**
 * Full markup breakdown for display in UI.
 */
export function getMarkupBreakdown(
  unitCost: number,
  orgRules?: MarkupTier[],
): MarkupBreakdown {
  const tier = findMarkupTier(unitCost, orgRules);
  const billPrice = unitCost * (1 + tier.markupPct);
  return {
    unitCost,
    tierLabel: tier.label,
    markupPct: tier.markupPct,
    markupAmount: billPrice - unitCost,
    billPrice,
    marginPct: getPartsMargin(unitCost, billPrice),
  };
}

/**
 * Preview all tiers with sample prices — useful for the settings UI.
 */
export function getMarkupTierPreviews(
  orgRules?: MarkupTier[],
): Array<MarkupTier & { sampleCost: number; sampleBillPrice: number }> {
  const tiers = orgRules && orgRules.length > 0 ? orgRules : DEFAULT_MARKUP_TIERS;
  return tiers.map(tier => {
    const sampleCost = tier.minCost === 0 ? 10 : tier.minCost;
    return { ...tier, sampleCost, sampleBillPrice: sampleCost * (1 + tier.markupPct) };
  });
}
