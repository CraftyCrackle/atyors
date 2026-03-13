const { getEarliestAcceptDate } = (() => {
  function getEarliestAcceptDate(booking) {
    const scheduled = new Date(booking.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);

    const pot = (booking.putOutTime || '').toLowerCase();
    const svcName = (booking.serviceTypeId?.name || booking.serviceTypeId?.slug || '').toLowerCase();
    const isPutOut = svcName.includes('put-out') || svcName.includes('put out');
    const hasEveningTime = pot.includes('night before') || pot.includes('pm');

    if (isPutOut || hasEveningTime) {
      const dayBefore = new Date(scheduled);
      dayBefore.setDate(dayBefore.getDate() - 1);
      return dayBefore;
    }
    return scheduled;
  }
  return { getEarliestAcceptDate };
})();

describe('Servicer accept-date enforcement', () => {
  const localDate = new Date(2026, 2, 10);

  test('bring-in only job: earliest accept is the scheduled date', () => {
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { name: 'Bring In Only', slug: 'bring-in' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });

  test('put-out service type (no putOutTime): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { name: 'Put Out Only', slug: 'put-out' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('put-out with slug: earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '', serviceTypeId: { slug: 'put-out' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('evening put-out (5-7 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '5–7 PM (Afternoon)', serviceTypeId: { name: 'Put Out Only', slug: 'put-out' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('evening put-out (9-11 PM): earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: '9–11 PM (Night)', serviceTypeId: { name: 'Put Out Only', slug: 'put-out' } };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('legacy night-before option: earliest accept is one day before', () => {
    const booking = { scheduledDate: localDate, putOutTime: 'Night before', serviceTypeId: {} };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(9);
  });

  test('no putOutTime and no service type defaults to scheduled date', () => {
    const booking = { scheduledDate: localDate };
    const earliest = getEarliestAcceptDate(booking);
    expect(earliest.getDate()).toBe(10);
  });
});

describe('getCalendarJobs', () => {
  const mongoose = require('mongoose');

  beforeEach(() => jest.restoreAllMocks());

  test('queries bookings for given month range', async () => {
    const mockBookings = [
      { _id: 'b1', scheduledDate: new Date('2026-03-05'), status: 'active', serviceTypeId: { slug: 'put-out' } },
      { _id: 'b2', scheduledDate: new Date('2026-03-12'), status: 'completed', serviceTypeId: { slug: 'bring-in' } },
    ];

    const Booking = require('../models/Booking');
    const chain = { select: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockBookings) }) }) };
    const populateMock = jest.fn().mockReturnValue(chain);
    jest.spyOn(Booking, 'find').mockReturnValue({ populate: populateMock });

    const { getCalendarJobs } = require('../services/servicerService');
    const servicerId = new mongoose.Types.ObjectId();
    const result = await getCalendarJobs(servicerId, '2026-03');

    expect(Booking.find).toHaveBeenCalledWith({
      assignedTo: servicerId,
      scheduledDate: { $gte: new Date(Date.UTC(2026, 2, 1)), $lt: new Date(Date.UTC(2026, 3, 1)) },
      status: { $nin: ['cancelled', 'denied'] },
    });
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('b1');
  });

  test('returns empty array for month with no jobs', async () => {
    const Booking = require('../models/Booking');
    const chain = { select: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) };
    jest.spyOn(Booking, 'find').mockReturnValue({ populate: jest.fn().mockReturnValue(chain) });

    const { getCalendarJobs } = require('../services/servicerService');
    const servicerId = new mongoose.Types.ObjectId();
    const result = await getCalendarJobs(servicerId, '2026-06');

    expect(result).toEqual([]);
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({
      scheduledDate: { $gte: new Date(Date.UTC(2026, 5, 1)), $lt: new Date(Date.UTC(2026, 6, 1)) },
    }));
  });
});
