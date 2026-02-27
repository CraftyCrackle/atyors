const Booking = require('../models/Booking');

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

  const baseMatch = { assignedTo: servicerId, status: 'completed' };

  const earningsExpr = { $ifNull: ['$serviceValue', '$amount'] };

  const [allTime, thisWeek, thisMonth, today] = await Promise.all([
    Booking.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, total: { $sum: earningsExpr }, count: { $sum: 1 }, barrels: { $sum: '$barrelCount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseMatch, completedAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: earningsExpr }, count: { $sum: 1 }, barrels: { $sum: '$barrelCount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseMatch, completedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: earningsExpr }, count: { $sum: 1 }, barrels: { $sum: '$barrelCount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseMatch, completedAt: { $gte: todayStart, $lt: todayEnd } } },
      { $group: { _id: null, total: { $sum: earningsExpr }, count: { $sum: 1 }, barrels: { $sum: '$barrelCount' } } },
    ]),
  ]);

  const dailyBreakdown = await Booking.aggregate([
    { $match: { ...baseMatch, completedAt: { $gte: weekStart } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        total: { $sum: earningsExpr },
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
    dailyBreakdown,
  };
}

module.exports = { getServicerStats };
