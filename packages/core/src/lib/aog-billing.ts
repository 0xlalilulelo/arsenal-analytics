/**
 * AOG billing calculations.
 * AOG events carry a 1.5× labor rate multiplier, 2-hour minimum callout,
 * mileage reimbursement, and drive-time charges per technician.
 */

export const AOG_MULTIPLIER = 1.5;
export const AOG_MINIMUM_HOURS = 2;
export const AOG_DEFAULT_MILEAGE_RATE = 1.25;   // $/mile
export const AOG_DEFAULT_DRIVE_RATE = 70.00;     // $/hr per technician
export const SHOP_SUPPLIES_DEFAULT_PCT = 0.035;
export const CUSTOMER_SUPPLIED_PARTS_FEE_PCT = 0.125;

export interface AOGCalloutInput {
  baseRate: number;         // standard labor rate ($/hr)
  laborHours: number;       // actual labor hours worked
  mileage?: number;         // one-way miles driven
  driveHours?: number;      // total drive time (hours, round-trip)
  techCount?: number;       // number of technicians dispatched
  mileageRate?: number;     // override default $1.25/mile
  driveRate?: number;       // override default $70/hr per tech
}

export interface AOGLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  category: 'LABOR' | 'OTHER';
}

export interface AOGCalloutBreakdown {
  aogRate: number;
  billableHours: number;       // max(actual, minimum)
  laborTotal: number;
  calloutFee: number;          // minimum 2hr charge if actual < 2hr
  mileageTotal: number;
  driveTimeTotal: number;
  grandTotal: number;
  lineItems: AOGLineItem[];
}

/**
 * Calculate complete AOG callout billing breakdown.
 * Returns individual line items ready to be added to a work order or invoice.
 */
export function calculateAOGCallout(input: AOGCalloutInput): AOGCalloutBreakdown {
  const {
    baseRate,
    laborHours,
    mileage = 0,
    driveHours = 0,
    techCount = 1,
    mileageRate = AOG_DEFAULT_MILEAGE_RATE,
    driveRate = AOG_DEFAULT_DRIVE_RATE,
  } = input;

  const aogRate = baseRate * AOG_MULTIPLIER;
  const billableHours = Math.max(laborHours, AOG_MINIMUM_HOURS);
  const laborTotal = billableHours * aogRate;

  // If actual hours < minimum, the difference is a callout fee line item
  const calloutFee = laborHours < AOG_MINIMUM_HOURS
    ? (AOG_MINIMUM_HOURS - laborHours) * aogRate
    : 0;

  const mileageTotal = mileage * mileageRate;
  const aogDriveRate = driveRate * AOG_MULTIPLIER;
  const driveTimeTotal = driveHours * aogDriveRate * techCount;
  const grandTotal = laborTotal + mileageTotal + driveTimeTotal;

  const lineItems: AOGLineItem[] = [];

  // Primary labor line
  lineItems.push({
    description: `AOG Labor — ${billableHours}h @ $${aogRate.toFixed(2)}/hr (1.5× standard)`,
    qty: billableHours,
    unitPrice: aogRate,
    total: laborTotal,
    category: 'LABOR',
  });

  // Callout minimum surcharge (shown separately for transparency)
  if (calloutFee > 0) {
    lineItems.push({
      description: `AOG Callout Minimum — 2hr minimum applies (${laborHours.toFixed(2)}h actual)`,
      qty: 1,
      unitPrice: calloutFee,
      total: calloutFee,
      category: 'LABOR',
    });
  }

  if (mileageTotal > 0) {
    lineItems.push({
      description: `Mileage — ${mileage} miles @ $${mileageRate.toFixed(2)}/mile`,
      qty: mileage,
      unitPrice: mileageRate,
      total: mileageTotal,
      category: 'OTHER',
    });
  }

  if (driveTimeTotal > 0) {
    lineItems.push({
      description: `Drive Time — ${driveHours}h × ${techCount} tech${techCount > 1 ? 's' : ''} @ $${aogDriveRate.toFixed(2)}/hr (1.5× AOG)`,
      qty: driveHours * techCount,
      unitPrice: aogDriveRate,
      total: driveTimeTotal,
      category: 'OTHER',
    });
  }

  return {
    aogRate,
    billableHours,
    laborTotal,
    calloutFee,
    mileageTotal,
    driveTimeTotal,
    grandTotal,
    lineItems,
  };
}

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
