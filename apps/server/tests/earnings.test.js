jest.mock('../models/Booking');

const Booking = require('../models/Booking');
const { getServicerStats, SERVICER_SHARE_RATE } = require('../services/earningsService');

describe('earningsService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('SERVICER_SHARE_RATE is 0.30', () => {
    expect(SERVICER_SHARE_RATE).toBe(0.30);
  });

  test('getServicerStats applies share rate and includes lastPayPeriod', async () => {
    Booking.aggregate
      .mockResolvedValueOnce([{ total: 30, count: 5, barrels: 10 }])
      .mockResolvedValueOnce([{ total: 15, count: 3, barrels: 6 }])
      .mockResolvedValueOnce([{ total: 24, count: 4, barrels: 8 }])
      .mockResolvedValueOnce([{ total: 6, count: 1, barrels: 2 }])
      .mockResolvedValueOnce([{ total: 12, count: 2, barrels: 4 }])
      .mockResolvedValueOnce([{ _id: '2026-03-01', total: 6, count: 1 }]);

    const result = await getServicerStats('servicer1');

    expect(result.allTime).toEqual({ total: 30, count: 5, barrels: 10 });
    expect(result.thisWeek).toEqual({ total: 15, count: 3, barrels: 6 });
    expect(result.thisMonth).toEqual({ total: 24, count: 4, barrels: 8 });
    expect(result.today).toEqual({ total: 6, count: 1, barrels: 2 });
    expect(result.lastPayPeriod.total).toBe(12);
    expect(result.lastPayPeriod.count).toBe(2);
    expect(result.lastPayPeriod.startDate).toBeDefined();
    expect(result.lastPayPeriod.endDate).toBeDefined();
    expect(result.servicerShareRate).toBe(0.30);

    expect(Booking.aggregate).toHaveBeenCalledTimes(6);
  });

  test('getServicerStats returns zeroes for no completed bookings', async () => {
    Booking.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getServicerStats('servicer2');

    expect(result.allTime).toEqual({ total: 0, count: 0, barrels: 0 });
    expect(result.lastPayPeriod.total).toBe(0);
    expect(result.dailyBreakdown).toEqual([]);
  });

  test('lastPayPeriod date range is seven local-calendar days (DST-safe)', async () => {
    Booking.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getServicerStats('servicer3');

    const start = new Date(result.lastPayPeriod.startDate);
    const end = new Date(result.lastPayPeriod.endDate);
    expect(end.getDay()).toBe(0);
    expect(start.getDay()).toBe(0);
    const ms = end.getTime() - start.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(ms - sevenDaysMs)).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });
});
