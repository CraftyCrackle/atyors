const {
  PRICE_PER_BARREL,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  calculateOneTimePrice,
  calculateCurbItemPrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
} = require('../services/pricingService');

describe('Pricing Service', () => {
  test('constants are correct', () => {
    expect(PRICE_PER_BARREL).toBe(1.50);
    expect(MONTHLY_BASE).toBe(24);
    expect(MONTHLY_BASE_BOTH).toBe(24);
    expect(MONTHLY_INCLUDED_BARRELS).toBe(3);
    expect(CURB_ITEM_PRICE).toBe(0.80);
  });

  describe('calculateOneTimePrice', () => {
    test('1 barrel = $1.50', () => {
      expect(calculateOneTimePrice(1)).toBe(1.50);
    });

    test('3 barrels = $4.50', () => {
      expect(calculateOneTimePrice(3)).toBe(4.50);
    });

    test('5 barrels = $7.50', () => {
      expect(calculateOneTimePrice(5)).toBe(7.50);
    });
  });

  describe('calculateCurbItemPrice', () => {
    test('1 item = $0.80', () => {
      expect(calculateCurbItemPrice(1)).toBeCloseTo(0.80);
    });

    test('5 items = $4.00', () => {
      expect(calculateCurbItemPrice(5)).toBeCloseTo(4.00);
    });

    test('10 items = $8.00', () => {
      expect(calculateCurbItemPrice(10)).toBeCloseTo(8.00);
    });
  });

  describe('calculateMonthlyPrice (single service)', () => {
    test('1 barrel = $24/mo base', () => {
      expect(calculateMonthlyPrice(1)).toBe(24);
    });

    test('3 barrels = $24/mo (included)', () => {
      expect(calculateMonthlyPrice(3)).toBe(24);
    });

    test('4 barrels = $24 + 1*$2 = $26/mo', () => {
      expect(calculateMonthlyPrice(4)).toBe(26);
    });

    test('5 barrels = $24 + 2*$2 = $28/mo', () => {
      expect(calculateMonthlyPrice(5)).toBe(28);
    });

    test('6 barrels = $24 + 3*$2 = $30/mo', () => {
      expect(calculateMonthlyPrice(6)).toBe(30);
    });
  });

  describe('calculateMonthlyPriceBoth (both services)', () => {
    test('1 barrel = $24/mo base', () => {
      expect(calculateMonthlyPriceBoth(1)).toBe(24);
    });

    test('3 barrels = $24/mo (included)', () => {
      expect(calculateMonthlyPriceBoth(3)).toBe(24);
    });

    test('4 barrels = $24 + 1*$2 = $26/mo', () => {
      expect(calculateMonthlyPriceBoth(4)).toBe(26);
    });

    test('5 barrels = $24 + 2*$2 = $28/mo', () => {
      expect(calculateMonthlyPriceBoth(5)).toBe(28);
    });

    test('6 barrels = $24 + 3*$2 = $30/mo', () => {
      expect(calculateMonthlyPriceBoth(6)).toBe(30);
    });
  });
});
