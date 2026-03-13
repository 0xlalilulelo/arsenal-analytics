/**
 * 90-day cash flow forecasting.
 *
 * Projection formula:
 *   Expected collections = open invoices weighted by payment terms probability
 *   WIP projection = in-progress WOs × estimated completion %
 *   Obligations = open PO values due within the window
 *   Net forecast = collections + wip_projected - obligations
 */

export type BillingTerms = 'NET_15' | 'NET_30' | 'NET_45' | 'COD' | 'PREPAY';

/** Expected collection probability by days-outstanding band */
const COLLECTION_PROBABILITY: Record<string, number> = {
  CURRENT:  0.97,
  '1_30':   0.92,
  '31_60':  0.78,
  '61_90':  0.55,
  '90_PLUS': 0.25,
};

/** Approximate collection timing (days) by billing terms */
const TERMS_COLLECTION_DAYS: Record<BillingTerms, number> = {
  PREPAY:  0,
  COD:     1,
  NET_15:  18,
  NET_30:  35,
  NET_45:  52,
};

export interface OpenInvoice {
  id: string;
  balance: number;
  dueDate: Date;
  billingTerms: BillingTerms;
  daysPastDue: number;
  agingBucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';
}

export interface WorkInProgress {
  id: string;
  estimatedTotal: number;
  completionPct: number;         // 0–1 estimated completion
  estimatedCloseDate: Date | null;
}

export interface OpenPurchaseOrder {
  id: string;
  outstanding: number;           // $ owed to vendor
  expectedDate: Date | null;
}

export interface CashFlowInput {
  openInvoices: OpenInvoice[];
  wip: WorkInProgress[];
  openPurchaseOrders: OpenPurchaseOrder[];
  asOf?: Date;
}

export interface PeriodForecast {
  expectedCollections: number;
  wipProjected: number;
  obligationsDue: number;
  netCashFlow: number;
}

export interface CashFlowForecast {
  asOf: Date;
  arByBucket: Record<string, number>;
  arTotal: number;
  wipTotal: number;
  obligationsTotal: number;
  forecast30d: PeriodForecast;
  forecast60d: PeriodForecast;
  forecast90d: PeriodForecast;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function invoiceExpectedWithinDays(inv: OpenInvoice, days: number): number {
  const prob = COLLECTION_PROBABILITY[inv.agingBucket] ?? 0.5;
  // Already past due — apply probability regardless of timing
  if (inv.daysPastDue > 0) {
    return inv.balance * prob;
  }
  // Current — estimate collection timing from terms
  const collectionDay = TERMS_COLLECTION_DAYS[inv.billingTerms] ?? 30;
  return collectionDay <= days ? inv.balance * prob : 0;
}

function wipExpectedWithinDays(
  wo: WorkInProgress,
  days: number,
  asOf: Date,
): number {
  if (!wo.estimatedCloseDate) {
    // Assume half the remaining WIP collectable within 30 days if no close date
    return wo.estimatedTotal * wo.completionPct * 0.5;
  }
  const daysToClose = daysBetween(asOf, wo.estimatedCloseDate);
  if (daysToClose <= days) {
    return wo.estimatedTotal * (1 - wo.completionPct); // remaining unbilled amount
  }
  return 0;
}

function poObligationsWithinDays(
  po: OpenPurchaseOrder,
  days: number,
  asOf: Date,
): number {
  if (!po.expectedDate) return po.outstanding; // assume due immediately if no date
  const daysToExpected = daysBetween(asOf, po.expectedDate);
  return daysToExpected <= days ? po.outstanding : 0;
}

export function buildCashFlowForecast(input: CashFlowInput): CashFlowForecast {
  const asOf = input.asOf ?? new Date();

  // AR by bucket
  const arByBucket: Record<string, number> = {
    CURRENT: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0,
  };
  for (const inv of input.openInvoices) {
    arByBucket[inv.agingBucket] = (arByBucket[inv.agingBucket] ?? 0) + inv.balance;
  }
  const arTotal = Object.values(arByBucket).reduce((s, v) => s + v, 0);

  const wipTotal = input.wip.reduce(
    (s, w) => s + w.estimatedTotal * (1 - w.completionPct),
    0,
  );

  const obligationsTotal = input.openPurchaseOrders.reduce(
    (s, po) => s + po.outstanding,
    0,
  );

  function buildPeriod(days: number): PeriodForecast {
    const expectedCollections = input.openInvoices.reduce(
      (s, inv) => s + invoiceExpectedWithinDays(inv, days),
      0,
    );
    const wipProjected = input.wip.reduce(
      (s, wo) => s + wipExpectedWithinDays(wo, days, asOf),
      0,
    );
    const obligationsDue = input.openPurchaseOrders.reduce(
      (s, po) => s + poObligationsWithinDays(po, days, asOf),
      0,
    );
    return {
      expectedCollections,
      wipProjected,
      obligationsDue,
      netCashFlow: expectedCollections + wipProjected - obligationsDue,
    };
  }

  return {
    asOf,
    arByBucket,
    arTotal,
    wipTotal,
    obligationsTotal,
    forecast30d: buildPeriod(30),
    forecast60d: buildPeriod(60),
    forecast90d: buildPeriod(90),
  };
}

/**
 * Simplified helper — takes raw DB aggregates and returns a flat snapshot
 * suitable for storing in CashFlowSnapshot model.
 */
export interface SimpleCashFlowInput {
  arCurrent: number;
  ar1to30: number;
  ar31to60: number;
  ar61to90: number;
  ar90plus: number;
  wipValue: number;
  partsOnOrder: number;
}

export interface SimpleCashFlowOutput {
  arTotal: number;
  arExpected30d: number;
  arExpected60d: number;
  arExpected90d: number;
  wipProjected30d: number;
  forecastBalance30d: number;
  forecastBalance60d: number;
  forecastBalance90d: number;
}

export function buildSimpleCashFlowSnapshot(
  input: SimpleCashFlowInput,
): SimpleCashFlowOutput {
  const { arCurrent, ar1to30, ar31to60, ar61to90, ar90plus, wipValue, partsOnOrder } = input;
  const arTotal = arCurrent + ar1to30 + ar31to60 + ar61to90 + ar90plus;

  const arExpected30d =
    arCurrent * COLLECTION_PROBABILITY['CURRENT'] +
    ar1to30   * COLLECTION_PROBABILITY['1_30'];

  const arExpected60d =
    arExpected30d +
    ar31to60  * COLLECTION_PROBABILITY['31_60'];

  const arExpected90d =
    arExpected60d +
    ar61to90  * COLLECTION_PROBABILITY['61_90'] +
    ar90plus  * COLLECTION_PROBABILITY['90_PLUS'];

  const wipProjected30d = wipValue * 0.4; // assume 40% of WIP completes/invoiced within 30d

  return {
    arTotal,
    arExpected30d,
    arExpected60d,
    arExpected90d,
    wipProjected30d,
    forecastBalance30d: arExpected30d + wipProjected30d - partsOnOrder * 0.5,
    forecastBalance60d: arExpected60d + wipValue * 0.7 - partsOnOrder * 0.8,
    forecastBalance90d: arExpected90d + wipValue - partsOnOrder,
  };
}
