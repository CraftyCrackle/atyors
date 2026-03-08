const {
  PRICE_PER_BARREL,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  SUBSCRIPTION_DISCOUNT_STANDARD,
  SUBSCRIPTION_DISCOUNT_LARGE,
  SUBSCRIPTION_DISCOUNT_THRESHOLD,
  calculateOneTimePrice,
  calculateCurbItemPrice,
  calculateSubscriptionDiscount,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
  calculateMonthlyPriceWithDiscount,
  calculateMonthlyPriceBothWithDiscount,
} = require('../services/pricingService');

describe('Pricing Service', () => {
  test('constants are correct', () => {
    expect(PRICE_PER_BARREL).toBe(1.50);
    expect(MONTHLY_BASE).toBe(15);
    expect(MONTHLY_BASE_BOTH).toBe(25);
    expect(MONTHLY_INCLUDED_BARRELS).toBe(3);
    expect(CURB_ITEM_PRICE).toBe(0.80);
    expect(SUBSCRIPTION_DISCOUNT_STANDARD).toBe(1);
    expect(SUBSCRIPTION_DISCOUNT_LARGE).toBe(2);
    expect(SUBSCRIPTION_DISCOUNT_THRESHOLD).toBe(3);
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

  describe('calculateSubscriptionDiscount', () => {
    test('1 barrel = $1 discount', () => {
      expect(calculateSubscriptionDiscount(1)).toBe(1);
    });

    test('3 barrels = $1 discount (at threshold)', () => {
      expect(calculateSubscriptionDiscount(3)).toBe(1);
    });

    test('4 barrels = $2 discount (above threshold)', () => {
      expect(calculateSubscriptionDiscount(4)).toBe(2);
    });

    test('6 barrels = $2 discount', () => {
      expect(calculateSubscriptionDiscount(6)).toBe(2);
    });
  });

  describe('calculateMonthlyPriceWithDiscount', () => {
    test('2 barrels = $15 - $1 = $14/mo', () => {
      expect(calculateMonthlyPriceWithDiscount(2)).toBe(14);
    });

    test('3 barrels = $15 - $1 = $14/mo', () => {
      expect(calculateMonthlyPriceWithDiscount(3)).toBe(14);
    });

    test('4 barrels = $17 - $2 = $15/mo', () => {
      expect(calculateMonthlyPriceWithDiscount(4)).toBe(15);
    });

    test('6 barrels = $21 - $2 = $19/mo', () => {
      expect(calculateMonthlyPriceWithDiscount(6)).toBe(19);
    });
  });

  describe('calculateMonthlyPriceBothWithDiscount', () => {
    test('2 barrels = $25 - $1 = $24/mo', () => {
      expect(calculateMonthlyPriceBothWithDiscount(2)).toBe(24);
    });

    test('3 barrels = $25 - $1 = $24/mo', () => {
      expect(calculateMonthlyPriceBothWithDiscount(3)).toBe(24);
    });

    test('4 barrels = $29 - $2 = $27/mo', () => {
      expect(calculateMonthlyPriceBothWithDiscount(4)).toBe(27);
    });

    test('6 barrels = $37 - $2 = $35/mo', () => {
      expect(calculateMonthlyPriceBothWithDiscount(6)).toBe(35);
    });
  });
});
