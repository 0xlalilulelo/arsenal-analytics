export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

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
