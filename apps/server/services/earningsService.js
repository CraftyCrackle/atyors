const Booking = require('../models/Booking');

const SERVICER_SHARE_RATE = 0.30;

async function getServicerStats(servicerId) {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lastWeekEnd = new Date(weekStart);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const baseMatch = { assignedTo: servicerId, status: 'completed' };

  const shareExpr = { $multiply: [{ $ifNull: ['$serviceValue', '$amount'] }, SERVICER_SHARE_RATE] };

  const groupFields = { _id: null, total: { $sum: shareExpr }, count: { $sum: 1 }, barrels: { $sum: '$barrelCount' } };

  const [allTime, thisWeek, thisMonth, today, lastPayPeriod] = await Promise.all([
    Booking.aggregate([{ $match: baseMatch }, { $group: groupFields }]),
    Booking.aggregate([{ $match: { ...baseMatch, completedAt: { $gte: weekStart } } }, { $group: groupFields }]),
    Booking.aggregate([{ $match: { ...baseMatch, completedAt: { $gte: monthStart } } }, { $group: groupFields }]),
    Booking.aggregate([{ $match: { ...baseMatch, completedAt: { $gte: todayStart, $lt: todayEnd } } }, { $group: groupFields }]),
    Booking.aggregate([{ $match: { ...baseMatch, completedAt: { $gte: lastWeekStart, $lt: lastWeekEnd } } }, { $group: groupFields }]),
  ]);

  const dailyBreakdown = await Booking.aggregate([
    { $match: { ...baseMatch, completedAt: { $gte: weekStart } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        total: { $sum: shareExpr },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const fmt = (arr) => arr[0] || { total: 0, count: 0, barrels: 0 };

  return {
    allTime: fmt(allTime),
    thisWeek: fmt(thisWeek),
    thisMonth: fmt(thisMonth),
    today: fmt(today),
    lastPayPeriod: {
      ...fmt(lastPayPeriod),
      startDate: lastWeekStart.toISOString(),
      endDate: lastWeekEnd.toISOString(),
    },
    dailyBreakdown,
    servicerShareRate: SERVICER_SHARE_RATE,
  };
}

module.exports = { getServicerStats, SERVICER_SHARE_RATE };
