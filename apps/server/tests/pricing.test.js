const {
  PRICE_PER_BARREL,
  PRICE_PER_BARREL_BOTH_TOTAL,
  CURB_ITEM_PRICE,
  MONTHLY_BASE,
  MONTHLY_BASE_BOTH,
  MONTHLY_INCLUDED_BARRELS,
  EC_MONTHLY_PER_FLOOR,
  EC_MONTHLY_PER_STAIRCASE,
  EC_MONTHLY_ENTRANCE_FEE,
  calculateOneTimePrice,
  calculateOneTimePriceBothLeg,
  calculateCurbItemPrice,
  calculateMonthlyPrice,
  calculateMonthlyPriceBoth,
  calculateEntranceCleaningPrice,
  calculateEntranceCleaningMonthlyPrice,
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

  describe('EC monthly constants', () => {
    test('EC_MONTHLY_PER_FLOOR = 12', () => {
      expect(EC_MONTHLY_PER_FLOOR).toBe(12);
    });
    test('EC_MONTHLY_PER_STAIRCASE = 6', () => {
      expect(EC_MONTHLY_PER_STAIRCASE).toBe(6);
    });
    test('EC_MONTHLY_ENTRANCE_FEE = 12', () => {
      expect(EC_MONTHLY_ENTRANCE_FEE).toBe(12);
    });
  });

  describe('calculateEntranceCleaningPrice (one-time)', () => {
    test('2 floors no staircases = $30', () => {
      expect(calculateEntranceCleaningPrice({ floors: 2, staircases: 0 })).toBe(30);
    });
    test('2 floors, 1 staircase, both entrances = $68', () => {
      expect(calculateEntranceCleaningPrice({ floors: 2, staircases: 1, frontEntrance: true, backEntrance: true })).toBe(68);
    });
    test('1 floor, 0 staircases, front entrance only = $30', () => {
      expect(calculateEntranceCleaningPrice({ floors: 1, staircases: 0, frontEntrance: true })).toBe(30);
    });
  });

  describe('calculateEntranceCleaningMonthlyPrice (bi-weekly subscription)', () => {
    test('2 floors no staircases = $24/cleaning', () => {
      expect(calculateEntranceCleaningMonthlyPrice({ floors: 2, staircases: 0 })).toBe(24);
    });
    test('2 floors, 1 staircase, both entrances = $54/cleaning', () => {
      expect(calculateEntranceCleaningMonthlyPrice({ floors: 2, staircases: 1, frontEntrance: true, backEntrance: true })).toBe(54);
    });
    test('monthly is cheaper than one-time for same inputs', () => {
      const inputs = { floors: 3, staircases: 2, frontEntrance: true, backEntrance: false };
      expect(calculateEntranceCleaningMonthlyPrice(inputs)).toBeLessThan(calculateEntranceCleaningPrice(inputs));
    });
  });
});
