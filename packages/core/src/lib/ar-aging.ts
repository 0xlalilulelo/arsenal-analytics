export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export type AgingBucketV2 = 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';

/**
 * Bucket boundaries are right-inclusive:
 *   CURRENT: daysOverdue <= 0
 *   1_30:    1 <= daysOverdue <= 30
 *   31_60:   31 <= daysOverdue <= 60
 *   61_90:   61 <= daysOverdue <= 90
 *   90_PLUS: daysOverdue > 90
 */
/** V2 API returning uppercase bucket names used by analytics routes */
export function classifyAgingBucket(dueDate: Date, asOf = new Date()): AgingBucketV2 {
  const daysOverdue = Math.floor(
    (asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysOverdue <= 0)  return 'CURRENT';
  if (daysOverdue <= 30) return '1_30';
  if (daysOverdue <= 60) return '31_60';
  if (daysOverdue <= 90) return '61_90';
  return '90_PLUS';
}


export interface AgingResult {
  bucket: AgingBucket;
  daysOverdue: number;
}

export function getAgingBucket(dueDate: Date, asOf = new Date()): AgingResult {
  const daysOverdue = Math.floor(
    (asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysOverdue <= 0)  return { bucket: 'current', daysOverdue: 0 };
  if (daysOverdue <= 30) return { bucket: '1-30', daysOverdue };
  if (daysOverdue <= 60) return { bucket: '31-60', daysOverdue };
  if (daysOverdue <= 90) return { bucket: '61-90', daysOverdue };
  return { bucket: '90+', daysOverdue };
}

export interface AgingSummary {
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
  total: number;
}

export function buildAgingSummary(
  invoices: Array<{ balance: number; dueDate: Date }>,
  asOf = new Date(),
): AgingSummary {
  const summary: AgingSummary = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };

  for (const inv of invoices) {
    if (inv.balance <= 0) continue;
    const { bucket } = getAgingBucket(inv.dueDate, asOf);
    summary[bucket] += inv.balance;
    summary.total += inv.balance;
  }

  return summary;
}
