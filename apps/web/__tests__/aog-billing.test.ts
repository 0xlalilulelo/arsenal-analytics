import { describe, it, expect } from 'vitest';
import {
  calculateAOGCallout,
  getAogRate,
  getShopSuppliesCharge,
  getCustomerSuppliedPartsHandlingFee,
  roundToQuarterHour,
  AOG_MULTIPLIER,
  AOG_MINIMUM_HOURS,
  AOG_DEFAULT_MILEAGE_RATE,
  AOG_DEFAULT_DRIVE_RATE,
  SHOP_SUPPLIES_DEFAULT_PCT,
  CUSTOMER_SUPPLIED_PARTS_FEE_PCT,
} from '@mro/core';

describe('constants', () => {
  it('AOG_MULTIPLIER is 1.5', () => expect(AOG_MULTIPLIER).toBe(1.5));
  it('AOG_MINIMUM_HOURS is 2', () => expect(AOG_MINIMUM_HOURS).toBe(2));
  it('default mileage rate is $1.25/mile', () => expect(AOG_DEFAULT_MILEAGE_RATE).toBe(1.25));
  it('default drive rate is $70/hr', () => expect(AOG_DEFAULT_DRIVE_RATE).toBe(70));
});

describe('getAogRate', () => {
  it('multiplies base rate by 1.5', () => {
    expect(getAogRate(100)).toBe(150);
  });

  it('works with non-round numbers', () => {
    expect(getAogRate(80)).toBe(120);
  });
});

describe('calculateAOGCallout — 2-hour minimum', () => {
  it('applies 2-hour minimum when actual hours are less than 2', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 1 });
    expect(result.billableHours).toBe(2);
    expect(result.aogRate).toBe(150);
    expect(result.laborTotal).toBe(300);  // 2hr × $150
  });

  it('charges callout fee when actual hours < 2', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 0.5 });
    expect(result.calloutFee).toBe(225);  // 1.5hr × $150
    expect(result.billableHours).toBe(2);
  });

  it('no callout fee when actual hours equal minimum', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 2 });
    expect(result.calloutFee).toBe(0);
    expect(result.billableHours).toBe(2);
  });

  it('no callout fee when actual hours exceed minimum', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 4 });
    expect(result.calloutFee).toBe(0);
    expect(result.billableHours).toBe(4);
    expect(result.laborTotal).toBe(600);  // 4hr × $150
  });
});

describe('calculateAOGCallout — mileage', () => {
  it('calculates mileage at default rate', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, mileage: 50 });
    expect(result.mileageTotal).toBe(62.5);  // 50 × $1.25
  });

  it('calculates mileage at custom rate', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, mileage: 100, mileageRate: 2.00 });
    expect(result.mileageTotal).toBe(200);
  });

  it('mileage is zero when not provided', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3 });
    expect(result.mileageTotal).toBe(0);
  });
});

describe('calculateAOGCallout — drive time', () => {
  it('calculates drive time for single tech at default rate', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, driveHours: 2 });
    expect(result.driveTimeTotal).toBe(140);  // 2hr × $70/hr × 1 tech
  });

  it('multiplies drive time by tech count', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, driveHours: 2, techCount: 3 });
    expect(result.driveTimeTotal).toBe(420);  // 2hr × $70/hr × 3 techs
  });

  it('uses custom drive rate', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, driveHours: 1, driveRate: 90 });
    expect(result.driveTimeTotal).toBe(90);
  });
});

describe('calculateAOGCallout — grand total', () => {
  it('sums all components correctly', () => {
    const result = calculateAOGCallout({
      baseRate: 100,
      laborHours: 3,
      mileage: 50,
      driveHours: 2,
      techCount: 2,
    });
    // aogRate: 150, labor: 3×150=450, mileage: 50×1.25=62.5, drive: 2hr×70×2=280
    expect(result.grandTotal).toBe(450 + 62.5 + 280);
  });
});

describe('calculateAOGCallout — line items', () => {
  it('always has a labor line item', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3 });
    const laborLines = result.lineItems.filter(l => l.category === 'LABOR');
    expect(laborLines.length).toBeGreaterThanOrEqual(1);
    expect(laborLines[0].total).toBe(result.laborTotal);
  });

  it('adds callout minimum line when hours < 2', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 0.5 });
    const calloutLine = result.lineItems.find(l => l.description.includes('Callout Minimum'));
    expect(calloutLine).toBeDefined();
    expect(calloutLine!.total).toBe(result.calloutFee);
  });

  it('adds mileage line when mileage > 0', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, mileage: 40 });
    const mileageLine = result.lineItems.find(l => l.description.includes('Mileage'));
    expect(mileageLine).toBeDefined();
    expect(mileageLine!.total).toBe(result.mileageTotal);
  });

  it('adds drive time line when driveHours > 0', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3, driveHours: 1 });
    const driveLine = result.lineItems.find(l => l.description.includes('Drive Time'));
    expect(driveLine).toBeDefined();
  });

  it('no mileage or drive lines when not provided', () => {
    const result = calculateAOGCallout({ baseRate: 100, laborHours: 3 });
    expect(result.lineItems).toHaveLength(1);
  });
});

describe('getShopSuppliesCharge', () => {
  it('calculates at default 3.5%', () => {
    expect(getShopSuppliesCharge(1000)).toBeCloseTo(35);
  });

  it('calculates at custom percentage', () => {
    expect(getShopSuppliesCharge(1000, 0.05)).toBe(50);
  });
});

describe('getCustomerSuppliedPartsHandlingFee', () => {
  it('charges 12.5% handling fee', () => {
    expect(getCustomerSuppliedPartsHandlingFee(400)).toBe(50);
    expect(CUSTOMER_SUPPLIED_PARTS_FEE_PCT).toBe(0.125);
  });
});

describe('roundToQuarterHour', () => {
  it('rounds 1.1 to 1.0', () => expect(roundToQuarterHour(1.1)).toBe(1.0));
  it('rounds 1.13 to 1.25', () => expect(roundToQuarterHour(1.13)).toBe(1.25));
  it('rounds 1.4 to 1.5', () => expect(roundToQuarterHour(1.4)).toBe(1.5));
  it('rounds 1.9 to 2.0', () => expect(roundToQuarterHour(1.9)).toBe(2.0));
  it('preserves exact quarter hours', () => {
    expect(roundToQuarterHour(2.75)).toBe(2.75);
    expect(roundToQuarterHour(3.5)).toBe(3.5);
  });
});
