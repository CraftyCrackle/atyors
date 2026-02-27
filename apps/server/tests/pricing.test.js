const {
  PRICE_PER_BARREL,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  calculateOneTimePrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
} = require('../services/pricingService');

describe('Pricing Service', () => {
  test('constants are correct', () => {
    expect(PRICE_PER_BARREL).toBe(1.50);
    expect(MONTHLY_BASE).toBe(15);
    expect(MONTHLY_BASE_BOTH).toBe(25);
    expect(MONTHLY_INCLUDED_BARRELS).toBe(3);
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

  describe('calculateMonthlyPrice (single service)', () => {
    test('1 barrel = $15/mo base', () => {
      expect(calculateMonthlyPrice(1)).toBe(15);
    });

    test('3 barrels = $15/mo (included)', () => {
      expect(calculateMonthlyPrice(3)).toBe(15);
    });

    test('5 barrels = $15 + 2*$2 = $19/mo', () => {
      expect(calculateMonthlyPrice(5)).toBe(19);
    });
  });

  describe('calculateMonthlyPriceBoth (both services)', () => {
    test('1 barrel = $25/mo base', () => {
      expect(calculateMonthlyPriceBoth(1)).toBe(25);
    });

    test('3 barrels = $25/mo (included)', () => {
      expect(calculateMonthlyPriceBoth(3)).toBe(25);
    });

    test('5 barrels = $25 + 2*$2*2 = $33/mo', () => {
      expect(calculateMonthlyPriceBoth(5)).toBe(33);
    });
  });
});
