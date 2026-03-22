const {
  PRICE_PER_BARREL,
  PRICE_PER_BARREL_BOTH_TOTAL,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  calculateOneTimePrice,
  calculateOneTimePriceBothLeg,
  calculateCurbItemPrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
} = require('../services/pricingService');

describe('Pricing Service', () => {
  test('constants are correct', () => {
    expect(PRICE_PER_BARREL).toBe(2.5);
    expect(PRICE_PER_BARREL_BOTH_TOTAL).toBe(4.0);
    expect(MONTHLY_BASE).toBe(30);
    expect(MONTHLY_BASE_BOTH).toBe(30);
    expect(MONTHLY_INCLUDED_BARRELS).toBe(3);
    expect(CURB_ITEM_PRICE).toBe(2.0);
  });

  describe('calculateOneTimePrice (one-way)', () => {
    test('1 barrel = $2.50', () => {
      expect(calculateOneTimePrice(1)).toBe(2.5);
    });

    test('3 barrels = $7.50', () => {
      expect(calculateOneTimePrice(3)).toBe(7.5);
    });

    test('5 barrels = $12.50', () => {
      expect(calculateOneTimePrice(5)).toBe(12.5);
    });
  });

  describe('calculateOneTimePriceBothLeg (per linked booking for both)', () => {
    test('1 barrel = $2.00 per leg ($4 total)', () => {
      expect(calculateOneTimePriceBothLeg(1)).toBe(2.0);
    });

    test('3 barrels = $6.00 per leg ($12 total)', () => {
      expect(calculateOneTimePriceBothLeg(3)).toBe(6.0);
    });
  });

  describe('calculateCurbItemPrice', () => {
    test('1 item = $2.00', () => {
      expect(calculateCurbItemPrice(1)).toBeCloseTo(2.0);
    });

    test('5 items = $10.00', () => {
      expect(calculateCurbItemPrice(5)).toBeCloseTo(10.0);
    });

    test('10 items = $20.00', () => {
      expect(calculateCurbItemPrice(10)).toBeCloseTo(20.0);
    });
  });

  describe('calculateMonthlyPrice (single service)', () => {
    test('1 barrel = $30/mo base', () => {
      expect(calculateMonthlyPrice(1)).toBe(30);
    });

    test('3 barrels = $30/mo (included)', () => {
      expect(calculateMonthlyPrice(3)).toBe(30);
    });

    test('4 barrels = $30 + 1*$3 = $33/mo', () => {
      expect(calculateMonthlyPrice(4)).toBe(33);
    });

    test('5 barrels = $30 + 2*$3 = $36/mo', () => {
      expect(calculateMonthlyPrice(5)).toBe(36);
    });

    test('6 barrels = $30 + 3*$3 = $39/mo', () => {
      expect(calculateMonthlyPrice(6)).toBe(39);
    });
  });

  describe('calculateMonthlyPriceBoth (both services)', () => {
    test('1 barrel = $30/mo base', () => {
      expect(calculateMonthlyPriceBoth(1)).toBe(30);
    });

    test('3 barrels = $30/mo (included)', () => {
      expect(calculateMonthlyPriceBoth(3)).toBe(30);
    });

    test('4 barrels = $30 + 1*$3 = $33/mo', () => {
      expect(calculateMonthlyPriceBoth(4)).toBe(33);
    });

    test('5 barrels = $30 + 2*$3 = $36/mo', () => {
      expect(calculateMonthlyPriceBoth(5)).toBe(36);
    });

    test('6 barrels = $30 + 3*$3 = $39/mo', () => {
      expect(calculateMonthlyPriceBoth(6)).toBe(39);
    });
  });
});
