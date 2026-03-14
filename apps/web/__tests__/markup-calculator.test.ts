import { describe, it, expect } from 'vitest';
import {
  findMarkupTier,
  getMarkupPct,
  getBillPrice,
  getPartsMargin,
  getMarkupBreakdown,
  DEFAULT_MARKUP_TIERS,
  type MarkupTier,
} from '@mro/core';

describe('findMarkupTier', () => {
  it('applies 100% markup for parts under $25', () => {
    const tier = findMarkupTier(10);
    expect(tier.markupPct).toBe(1.00);
  });

  it('applies 75% markup for parts between $25 and $500', () => {
    const tier = findMarkupTier(100);
    expect(tier.markupPct).toBe(0.75);
  });

  it('applies 50% markup for parts between $500 and $2000', () => {
    const tier = findMarkupTier(750);
    expect(tier.markupPct).toBe(0.50);
  });

  it('applies 35% markup for parts between $2K and $5K', () => {
    const tier = findMarkupTier(3000);
    expect(tier.markupPct).toBe(0.35);
  });

  it('applies 25% markup for parts over $5K', () => {
    const tier = findMarkupTier(10000);
    expect(tier.markupPct).toBe(0.25);
  });

  it('uses org-level rules when provided', () => {
    const customRules: MarkupTier[] = [
      { label: 'All', minCost: 0, maxCost: null, markupPct: 0.40 },
    ];
    const tier = findMarkupTier(100, customRules);
    expect(tier.markupPct).toBe(0.40);
  });

  it('falls back to defaults when empty org rules provided', () => {
    const tier = findMarkupTier(100, []);
    expect(tier.markupPct).toBe(0.75); // same as default $25–$500 tier
  });
});

describe('getBillPrice', () => {
  it('calculates bill price from unit cost and markup', () => {
    expect(getBillPrice(100, 0.75)).toBeCloseTo(175);
  });

  it('uses org rules when no markup pct given', () => {
    // $100 part → 75% default markup → $175
    expect(getBillPrice(100)).toBeCloseTo(175);
  });

  it('never returns less than cost', () => {
    expect(getBillPrice(100, 0)).toBe(100);
  });
});

describe('getPartsMargin', () => {
  it('calculates gross margin percentage', () => {
    const margin = getPartsMargin(100, 175);
    // (175 - 100) / 175 ≈ 42.86%
    expect(margin).toBeCloseTo(0.4286, 4);
  });

  it('returns 0 when bill price is 0', () => {
    expect(getPartsMargin(100, 0)).toBe(0);
  });
});

describe('getMarkupBreakdown', () => {
  it('returns a full breakdown for a $100 part', () => {
    const b = getMarkupBreakdown(100);
    expect(b.unitCost).toBe(100);
    expect(b.markupPct).toBe(0.75);
    expect(b.billPrice).toBeCloseTo(175);
    expect(b.markupAmount).toBeCloseTo(75);
    expect(b.marginPct).toBeCloseTo(0.4286, 4);
  });

  it('boundary: $25.00 falls in the $25–$500 tier', () => {
    const b = getMarkupBreakdown(25);
    expect(b.markupPct).toBe(0.75);
  });

  it('boundary: $500.00 falls in the $500–$2000 tier', () => {
    const b = getMarkupBreakdown(500);
    expect(b.markupPct).toBe(0.50);
  });
});

describe('DEFAULT_MARKUP_TIERS', () => {
  it('has 5 tiers', () => {
    expect(DEFAULT_MARKUP_TIERS).toHaveLength(5);
  });

  it('tiers cover all cost ranges from 0 to infinity', () => {
    const last = DEFAULT_MARKUP_TIERS[DEFAULT_MARKUP_TIERS.length - 1];
    expect(last.maxCost).toBeNull();
  });
});
