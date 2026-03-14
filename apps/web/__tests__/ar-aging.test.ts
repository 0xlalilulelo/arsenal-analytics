import { describe, it, expect } from 'vitest';
import {
  classifyAgingBucket,
  getAgingBucket,
  buildAgingSummary,
} from '@mro/core';

const daysAgo = (n: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
};

describe('classifyAgingBucket', () => {
  const asOf = new Date('2024-06-01');

  it('returns CURRENT when dueDate is today', () => {
    expect(classifyAgingBucket(new Date('2024-06-01'), asOf)).toBe('CURRENT');
  });

  it('returns CURRENT when dueDate is in the future', () => {
    expect(classifyAgingBucket(new Date('2024-06-15'), asOf)).toBe('CURRENT');
  });

  it('returns 1_30 for 1 day overdue', () => {
    expect(classifyAgingBucket(new Date('2024-05-31'), asOf)).toBe('1_30');
  });

  it('returns 1_30 for 30 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-05-02'), asOf)).toBe('1_30');
  });

  it('returns 31_60 for 31 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-05-01'), asOf)).toBe('31_60');
  });

  it('returns 31_60 for 60 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-04-02'), asOf)).toBe('31_60');
  });

  it('returns 61_90 for 61 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-04-01'), asOf)).toBe('61_90');
  });

  it('returns 61_90 for 90 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-03-03'), asOf)).toBe('61_90');
  });

  it('returns 90_PLUS for 91 days overdue', () => {
    expect(classifyAgingBucket(new Date('2024-03-02'), asOf)).toBe('90_PLUS');
  });
});

describe('getAgingBucket', () => {
  const asOf = new Date('2024-06-01');

  it('returns current with 0 daysOverdue when not overdue', () => {
    const result = getAgingBucket(new Date('2024-06-01'), asOf);
    expect(result.bucket).toBe('current');
    expect(result.daysOverdue).toBe(0);
  });

  it('returns 1-30 bucket for 15 days overdue', () => {
    const result = getAgingBucket(new Date('2024-05-17'), asOf);
    expect(result.bucket).toBe('1-30');
    expect(result.daysOverdue).toBe(15);
  });

  it('returns 31-60 bucket for 45 days overdue', () => {
    const result = getAgingBucket(new Date('2024-04-17'), asOf);
    expect(result.bucket).toBe('31-60');
    expect(result.daysOverdue).toBe(45);
  });

  it('returns 61-90 bucket for 75 days overdue', () => {
    const result = getAgingBucket(new Date('2024-03-18'), asOf);
    expect(result.bucket).toBe('61-90');
    expect(result.daysOverdue).toBe(75);
  });

  it('returns 90+ bucket for 120 days overdue', () => {
    const result = getAgingBucket(new Date('2024-02-02'), asOf);
    expect(result.bucket).toBe('90+');
    expect(result.daysOverdue).toBe(120);
  });
});

describe('buildAgingSummary', () => {
  const asOf = new Date('2024-06-01');

  it('returns zero totals for empty invoice list', () => {
    const summary = buildAgingSummary([], asOf);
    expect(summary.total).toBe(0);
    expect(summary.current).toBe(0);
  });

  it('skips invoices with zero or negative balance', () => {
    const invoices = [
      { balance: 0, dueDate: new Date('2024-05-01') },
      { balance: -100, dueDate: new Date('2024-05-01') },
    ];
    const summary = buildAgingSummary(invoices, asOf);
    expect(summary.total).toBe(0);
  });

  it('correctly buckets invoices across all aging ranges', () => {
    const invoices = [
      { balance: 1000, dueDate: new Date('2024-06-15') },  // current
      { balance: 500,  dueDate: new Date('2024-05-20') },  // 1-30
      { balance: 300,  dueDate: new Date('2024-04-17') },  // 31-60
      { balance: 200,  dueDate: new Date('2024-03-18') },  // 61-90
      { balance: 100,  dueDate: new Date('2024-02-01') },  // 90+
    ];
    const summary = buildAgingSummary(invoices, asOf);
    expect(summary.current).toBe(1000);
    expect(summary['1-30']).toBe(500);
    expect(summary['31-60']).toBe(300);
    expect(summary['61-90']).toBe(200);
    expect(summary['90+']).toBe(100);
    expect(summary.total).toBe(2100);
  });

  it('accumulates multiple invoices in the same bucket', () => {
    const invoices = [
      { balance: 400, dueDate: new Date('2024-05-20') },  // 1-30
      { balance: 600, dueDate: new Date('2024-05-10') },  // 1-30
    ];
    const summary = buildAgingSummary(invoices, asOf);
    expect(summary['1-30']).toBe(1000);
    expect(summary.total).toBe(1000);
  });
});
