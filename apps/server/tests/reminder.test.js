const {
  getHolidaysForYear,
  getHolidayOn,
  isHoliday,
  getEffectivePickupDate,
  observedDate,
} = require('../services/reminderService');

describe('Holiday Detection', () => {
  test('generates correct fixed-date holidays for 2026', () => {
    const holidays = getHolidaysForYear(2026);
    const names = holidays.map((h) => h.name);

    expect(names).toContain("New Year's Day");
    expect(names).toContain('Independence Day');
    expect(names).toContain('Christmas Day');
    expect(names).toContain('Thanksgiving');
    expect(names).toContain('Memorial Day');
    expect(names).toContain('Labor Day');
  });

  test('computes Thanksgiving correctly (4th Thursday of November)', () => {
    const holidays = getHolidaysForYear(2026);
    const tg = holidays.find((h) => h.name === 'Thanksgiving');
    expect(tg.date.getMonth()).toBe(10);
    expect(tg.date.getDay()).toBe(4);
    expect(tg.date.getDate()).toBe(26);
  });

  test('computes Memorial Day correctly (last Monday of May)', () => {
    const holidays = getHolidaysForYear(2026);
    const md = holidays.find((h) => h.name === 'Memorial Day');
    expect(md.date.getMonth()).toBe(4);
    expect(md.date.getDay()).toBe(1);
    expect(md.date.getDate()).toBe(25);
  });

  test('computes Labor Day correctly (1st Monday of September)', () => {
    const holidays = getHolidaysForYear(2026);
    const ld = holidays.find((h) => h.name === 'Labor Day');
    expect(ld.date.getMonth()).toBe(8);
    expect(ld.date.getDay()).toBe(1);
    expect(ld.date.getDate()).toBe(7);
  });

  test('computes MLK Day correctly (3rd Monday of January)', () => {
    const holidays = getHolidaysForYear(2026);
    const mlk = holidays.find((h) => h.name === 'Martin Luther King Jr. Day');
    expect(mlk.date.getMonth()).toBe(0);
    expect(mlk.date.getDay()).toBe(1);
    expect(mlk.date.getDate()).toBe(19);
  });
});

describe('Observed Date (weekend shifting)', () => {
  test('Saturday holiday observed on preceding Friday', () => {
    const sat = new Date(2026, 6, 4);
    expect(sat.getDay()).toBe(6);
    const obs = observedDate(sat);
    expect(obs.getDay()).toBe(5);
    expect(obs.getDate()).toBe(3);
  });

  test('Sunday holiday observed on following Monday', () => {
    const sun = new Date(2023, 0, 1);
    expect(sun.getDay()).toBe(0);
    const obs = observedDate(sun);
    expect(obs.getDay()).toBe(1);
    expect(obs.getDate()).toBe(2);
  });

  test('weekday holiday observed on same day', () => {
    const thu = new Date(2026, 10, 26);
    expect(thu.getDay()).toBe(4);
    const obs = observedDate(thu);
    expect(obs.getDate()).toBe(26);
  });
});

describe('getHolidayOn / isHoliday', () => {
  test('returns holiday name for Christmas 2026 (Friday)', () => {
    const xmas = new Date(2026, 11, 25);
    expect(getHolidayOn(xmas)).toBe('Christmas Day');
    expect(isHoliday(xmas)).toBe(true);
  });

  test('returns null for a regular weekday', () => {
    const regular = new Date(2026, 2, 10);
    expect(getHolidayOn(regular)).toBeNull();
    expect(isHoliday(regular)).toBe(false);
  });

  test('returns holiday on the observed date when actual is weekend', () => {
    const july4 = new Date(2026, 6, 4);
    expect(july4.getDay()).toBe(6);
    const observedFri = new Date(2026, 6, 3);
    expect(getHolidayOn(observedFri)).toBe('Independence Day');
    expect(getHolidayOn(july4)).toBeNull();
  });
});

describe('getEffectivePickupDate (holiday shift)', () => {
  test('no shift on a normal week', () => {
    const wed = new Date(2026, 2, 11);
    expect(wed.getDay()).toBe(3);
    const { date, holiday } = getEffectivePickupDate(wed);
    expect(date.getDate()).toBe(11);
    expect(holiday).toBeNull();
  });

  test('shifts Wednesday pickup to Thursday when Monday is a holiday', () => {
    const holidays2026 = getHolidaysForYear(2026);
    const mlk = holidays2026.find((h) => h.name === 'Martin Luther King Jr. Day');
    expect(mlk.date.getDay()).toBe(1);

    const wed = new Date(2026, 0, 21);
    expect(wed.getDay()).toBe(3);
    const { date, holiday } = getEffectivePickupDate(wed);
    expect(date.getDay()).toBe(4);
    expect(date.getDate()).toBe(22);
    expect(holiday).toBe('Martin Luther King Jr. Day');
  });

  test('shifts Monday pickup to Tuesday when Monday is a holiday', () => {
    const mon = new Date(2026, 0, 19);
    expect(mon.getDay()).toBe(1);
    const { date, holiday } = getEffectivePickupDate(mon);
    expect(date.getDay()).toBe(2);
    expect(date.getDate()).toBe(20);
    expect(holiday).toBe('Martin Luther King Jr. Day');
  });

  test('does not shift pickup before the holiday day', () => {
    const thanksgiving2026 = new Date(2026, 10, 26);
    expect(thanksgiving2026.getDay()).toBe(4);

    const tue = new Date(2026, 10, 24);
    expect(tue.getDay()).toBe(2);
    const { date, holiday } = getEffectivePickupDate(tue);
    expect(date.getDate()).toBe(24);
    expect(holiday).toBeNull();
  });

  test('shifts Friday pickup when Thanksgiving (Thursday) is in that week', () => {
    const fri = new Date(2026, 10, 27);
    expect(fri.getDay()).toBe(5);
    const { date, holiday } = getEffectivePickupDate(fri);
    expect(date.getDay()).toBe(6);
    expect(date.getDate()).toBe(28);
    expect(holiday).toBe('Thanksgiving');
  });

  test('does not shift weekend pickups', () => {
    const sat = new Date(2026, 0, 17);
    expect(sat.getDay()).toBe(6);
    const { date, holiday } = getEffectivePickupDate(sat);
    expect(date.getDate()).toBe(17);
    expect(holiday).toBeNull();
  });
});
