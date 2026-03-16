const {
  weekOccurrence,
  matchesWeekPattern,
  isInSeason,
  formatTimeRange,
} = require('../services/reminderService');

describe('weekOccurrence', () => {
  test('1st of month is 1st occurrence', () => {
    expect(weekOccurrence(new Date(2026, 0, 5))).toBe(1);
  });

  test('8th of month is 2nd occurrence', () => {
    expect(weekOccurrence(new Date(2026, 0, 8))).toBe(2);
  });

  test('15th of month is 3rd occurrence', () => {
    expect(weekOccurrence(new Date(2026, 0, 15))).toBe(3);
  });

  test('22nd of month is 4th occurrence', () => {
    expect(weekOccurrence(new Date(2026, 0, 22))).toBe(4);
  });

  test('29th of month is 5th occurrence', () => {
    expect(weekOccurrence(new Date(2026, 0, 29))).toBe(5);
  });
});

describe('matchesWeekPattern', () => {
  test('"every" matches any date', () => {
    expect(matchesWeekPattern('every', new Date(2026, 0, 5))).toBe(true);
    expect(matchesWeekPattern('every', new Date(2026, 0, 22))).toBe(true);
  });

  test('"1st" only matches 1st occurrence', () => {
    expect(matchesWeekPattern('1st', new Date(2026, 0, 5))).toBe(true);
    expect(matchesWeekPattern('1st', new Date(2026, 0, 12))).toBe(false);
  });

  test('"3rd" only matches 3rd occurrence', () => {
    expect(matchesWeekPattern('3rd', new Date(2026, 0, 15))).toBe(true);
    expect(matchesWeekPattern('3rd', new Date(2026, 0, 8))).toBe(false);
  });

  test('"1st_and_3rd" matches 1st and 3rd but not 2nd or 4th', () => {
    expect(matchesWeekPattern('1st_and_3rd', new Date(2026, 0, 5))).toBe(true);
    expect(matchesWeekPattern('1st_and_3rd', new Date(2026, 0, 15))).toBe(true);
    expect(matchesWeekPattern('1st_and_3rd', new Date(2026, 0, 8))).toBe(false);
    expect(matchesWeekPattern('1st_and_3rd', new Date(2026, 0, 22))).toBe(false);
  });

  test('"2nd_and_4th" matches 2nd and 4th', () => {
    expect(matchesWeekPattern('2nd_and_4th', new Date(2026, 0, 8))).toBe(true);
    expect(matchesWeekPattern('2nd_and_4th', new Date(2026, 0, 22))).toBe(true);
    expect(matchesWeekPattern('2nd_and_4th', new Date(2026, 0, 5))).toBe(false);
  });
});

describe('isInSeason', () => {
  test('null season means year-round', () => {
    expect(isInSeason(new Date(2026, 0, 15), null, null)).toBe(true);
    expect(isInSeason(new Date(2026, 6, 15), null, null)).toBe(true);
  });

  test('April 1 to November 30 range', () => {
    expect(isInSeason(new Date(2026, 3, 1), '04-01', '11-30')).toBe(true);
    expect(isInSeason(new Date(2026, 6, 15), '04-01', '11-30')).toBe(true);
    expect(isInSeason(new Date(2026, 10, 30), '04-01', '11-30')).toBe(true);
    expect(isInSeason(new Date(2026, 11, 1), '04-01', '11-30')).toBe(false);
    expect(isInSeason(new Date(2026, 2, 31), '04-01', '11-30')).toBe(false);
    expect(isInSeason(new Date(2026, 0, 15), '04-01', '11-30')).toBe(false);
  });

  test('wrapping season (Nov to March) works correctly', () => {
    expect(isInSeason(new Date(2026, 11, 15), '11-01', '03-31')).toBe(true);
    expect(isInSeason(new Date(2026, 1, 15), '11-01', '03-31')).toBe(true);
    expect(isInSeason(new Date(2026, 5, 15), '11-01', '03-31')).toBe(false);
  });
});

describe('formatTimeRange', () => {
  test('formats both start and end', () => {
    expect(formatTimeRange('08:00', '12:00')).toBe('8AM–12PM');
  });

  test('formats with minutes', () => {
    expect(formatTimeRange('08:30', '11:30')).toBe('8:30AM–11:30AM');
  });

  test('handles start only', () => {
    expect(formatTimeRange('08:00', null)).toBe('starting 8AM');
  });

  test('handles no times', () => {
    expect(formatTimeRange(null, null)).toBe('');
  });
});

describe('Integration: 1st & 3rd Monday Apr-Nov (like the sign photo)', () => {
  const schedule = {
    dayOfWeek: 'Monday',
    weekPattern: '1st_and_3rd',
    seasonStart: '04-01',
    seasonEnd: '11-30',
  };

  function matches(date) {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return dayName === schedule.dayOfWeek
      && matchesWeekPattern(schedule.weekPattern, date)
      && isInSeason(date, schedule.seasonStart, schedule.seasonEnd);
  }

  test('1st Monday of April 2026 matches', () => {
    expect(matches(new Date(2026, 3, 6))).toBe(true);
  });

  test('3rd Monday of May 2026 matches', () => {
    expect(matches(new Date(2026, 4, 18))).toBe(true);
  });

  test('2nd Monday of April 2026 does NOT match', () => {
    expect(matches(new Date(2026, 3, 13))).toBe(false);
  });

  test('1st Monday of January 2026 does NOT match (out of season)', () => {
    expect(matches(new Date(2026, 0, 5))).toBe(false);
  });

  test('1st Monday of December 2026 does NOT match (out of season)', () => {
    expect(matches(new Date(2026, 11, 7))).toBe(false);
  });

  test('1st Tuesday of April 2026 does NOT match (wrong day)', () => {
    expect(matches(new Date(2026, 3, 7))).toBe(false);
  });
});
