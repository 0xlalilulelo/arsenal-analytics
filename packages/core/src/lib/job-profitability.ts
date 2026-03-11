export interface JobCostSummary {
  totalBilled: number;
  laborCost: number;       // actual shop labor cost (tech pay)
  laborRevenue: number;    // billed labor
  partsCost: number;       // parts at cost
  partsRevenue: number;    // parts at billed price
  shopSupplies: number;
  subcontractCost: number;
  grossProfit: number;
  grossMarginPct: number;  // 0.0–1.0
}

export function calcJobProfitability(input: {
  laborEntries: Array<{ hours: number; rateUsed: number; techCostRate: number; billable: boolean }>;
  partRequests: Array<{ qty: number; unitCost: number; unitBillPrice: number | null }>;
  shopSuppliesCharge: number;
  subcontractCost?: number;
}): JobCostSummary {
  const laborRevenue = input.laborEntries
    .filter(e => e.billable)
    .reduce((s, e) => s + e.hours * e.rateUsed, 0);

  const laborCost = input.laborEntries
    .filter(e => e.billable)
    .reduce((s, e) => s + e.hours * e.techCostRate, 0);

  const partsRevenue = input.partRequests.reduce(
    (s, p) => s + p.qty * (p.unitBillPrice ?? 0), 0,
  );
  const partsCost = input.partRequests.reduce(
    (s, p) => s + p.qty * (p.unitCost ?? 0), 0,
  );

  const subcontractCost = input.subcontractCost ?? 0;
  const totalBilled = laborRevenue + partsRevenue + input.shopSuppliesCharge;
  const totalCost = laborCost + partsCost + subcontractCost;
  const grossProfit = totalBilled - totalCost;
  const grossMarginPct = totalBilled > 0 ? grossProfit / totalBilled : 0;

  return {
    totalBilled,
    laborCost,
    laborRevenue,
    partsCost,
    partsRevenue,
    shopSupplies: input.shopSuppliesCharge,
    subcontractCost,
    grossProfit,
    grossMarginPct,
  };
}

export function calcEstimateVariance(estimated: number, actual: number): number {
  if (estimated <= 0) return 0;
  return (actual - estimated) / estimated;
}
