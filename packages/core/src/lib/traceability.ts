/**
 * Parts Traceability — install-time lot selection and expiration validation.
 *
 * Pure, testable functions used by the install endpoint and UI.
 */

export interface LotForInstall {
  id: string;
  serialNumber?: string | null;
  lotNumber?: string | null;
  batchNumber?: string | null;
  qtyOnHand: number;
  condition: string;
  mfgDate?: Date | string | null;
  expirationDate?: Date | string | null;
  createdAt: Date | string;
}

export type ExpirationVerdict =
  | { status: 'ok' }
  | { status: 'warn'; daysUntilExpiration: number }
  | { status: 'block'; reason: 'EXPIRED' | 'NO_QUANTITY' };

export interface PickLotOptions {
  /** 'fifo' picks the oldest received lot first (default). 'latest' picks newest. */
  strategy?: 'fifo' | 'latest';
  /** If true, reject lots whose expirationDate is on or before today. */
  excludeExpired?: boolean;
  /** Required install quantity. Only lots with qtyOnHand ≥ this are considered. */
  requiredQty?: number;
  /** Explicit serial number match. When set, only return the lot whose serial matches. */
  serialNumber?: string;
}

/**
 * Pick the best matching lot for install given the part, desired condition,
 * and strategy. Returns null if no viable lot is available.
 */
export function pickLotForInstall(
  lots: LotForInstall[],
  condition: string,
  options: PickLotOptions = {},
): LotForInstall | null {
  const { strategy = 'fifo', excludeExpired = true, requiredQty = 1, serialNumber } = options;
  const now = Date.now();

  const viable = lots.filter(lot => {
    if (lot.condition !== condition) return false;
    if (lot.qtyOnHand < requiredQty) return false;
    if (serialNumber && lot.serialNumber !== serialNumber) return false;
    if (excludeExpired && lot.expirationDate) {
      const exp = new Date(lot.expirationDate).getTime();
      if (exp <= now) return false;
    }
    return true;
  });

  if (viable.length === 0) return null;

  viable.sort((a, b) => {
    const aT = new Date(a.createdAt).getTime();
    const bT = new Date(b.createdAt).getTime();
    return strategy === 'fifo' ? aT - bT : bT - aT;
  });

  return viable[0];
}

/**
 * Validate a specific lot's expiration relative to an install date.
 * Returns 'ok' | 'warn' (within warnDays) | 'block' (expired / no qty).
 */
export function validateExpirationBeforeInstall(
  lot: LotForInstall,
  options: { warnDays?: number; installAt?: Date } = {},
): ExpirationVerdict {
  const { warnDays = 30, installAt = new Date() } = options;

  if (lot.qtyOnHand <= 0) {
    return { status: 'block', reason: 'NO_QUANTITY' };
  }
  if (!lot.expirationDate) return { status: 'ok' };

  const exp = new Date(lot.expirationDate).getTime();
  const now = installAt.getTime();

  if (exp <= now) return { status: 'block', reason: 'EXPIRED' };

  const daysUntilExpiration = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiration <= warnDays) return { status: 'warn', daysUntilExpiration };
  return { status: 'ok' };
}

/**
 * Determine whether a PartRequest requires a traced lot at install time.
 * Rule: any part flagged requires8130 must install from a specific PartLot.
 */
export function requiresLotTraceability(partRequest: { requires8130: boolean }): boolean {
  return partRequest.requires8130;
}
