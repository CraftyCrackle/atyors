const PROMO_CREDIT_EXPIRY = new Date('2026-04-30T23:59:59.000-04:00');
const PROMO_CREDIT_AMOUNT = 15;

function resolveCredit(userCredit, requestedCredit) {
  if (!requestedCredit || requestedCredit <= 0) return 0;
  const balance = userCredit?.balance ?? PROMO_CREDIT_AMOUNT;
  const expiry = userCredit?.expiresAt ?? PROMO_CREDIT_EXPIRY;
  if (new Date() > new Date(expiry)) return 0;
  if (balance <= 0) return 0;
  return Math.min(parseFloat(requestedCredit), balance);
}

function isCreditFullyCovering(userCredit, requestedCredit, bookingAmount) {
  if (!requestedCredit || requestedCredit <= 0) return false;
  const balance = userCredit?.balance ?? PROMO_CREDIT_AMOUNT;
  const expiry = userCredit?.expiresAt ?? PROMO_CREDIT_EXPIRY;
  if (new Date() > new Date(expiry)) return false;
  return balance >= requestedCredit && requestedCredit >= bookingAmount;
}

describe('Promo Credit — credit resolution', () => {
  test('returns 0 when no credit requested', () => {
    expect(resolveCredit({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, 0)).toBe(0);
  });

  test('returns requested amount when balance is sufficient', () => {
    expect(resolveCredit({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, 10)).toBe(10);
  });

  test('caps at balance when requested exceeds balance', () => {
    expect(resolveCredit({ balance: 5, expiresAt: PROMO_CREDIT_EXPIRY }, 15)).toBe(5);
  });

  test('returns 0 when credit is expired', () => {
    const expired = new Date('2025-01-01');
    expect(resolveCredit({ balance: 15, expiresAt: expired }, 10)).toBe(0);
  });

  test('returns 0 when balance is exhausted', () => {
    expect(resolveCredit({ balance: 0, expiresAt: PROMO_CREDIT_EXPIRY }, 10)).toBe(0);
  });

  test('grants default $15 credit to users without promoCredit field', () => {
    expect(resolveCredit(undefined, 10)).toBe(10);
    expect(resolveCredit(null, 10)).toBe(10);
  });
});

describe('Promo Credit — full coverage check', () => {
  test('returns true when credit fully covers booking', () => {
    expect(isCreditFullyCovering({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, 12, 12)).toBe(true);
  });

  test('returns false when credit is partial', () => {
    expect(isCreditFullyCovering({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, 15, 20)).toBe(false);
  });

  test('returns false when credit is expired', () => {
    const expired = new Date('2025-01-01');
    expect(isCreditFullyCovering({ balance: 15, expiresAt: expired }, 15, 15)).toBe(false);
  });

  test('returns false when no credit requested', () => {
    expect(isCreditFullyCovering({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, 0, 15)).toBe(false);
  });
});

describe('Promo Credit — net amount calculation', () => {
  test('net amount is 0 when credit covers full price', () => {
    const gross = 12;
    const credit = resolveCredit({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, gross);
    expect(Math.max(0, gross - credit)).toBe(0);
  });

  test('net amount is positive when credit is partial', () => {
    const gross = 30;
    const credit = resolveCredit({ balance: 15, expiresAt: PROMO_CREDIT_EXPIRY }, gross);
    expect(credit).toBe(15);
    expect(Math.max(0, gross - credit)).toBe(15);
  });

  test('net amount equals gross when credit is expired', () => {
    const gross = 10;
    const expired = new Date('2025-01-01');
    const credit = resolveCredit({ balance: 15, expiresAt: expired }, gross);
    expect(Math.max(0, gross - credit)).toBe(10);
  });
});
