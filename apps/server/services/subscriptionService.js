const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');

async function create(userId, data) {
  const subscription = await Subscription.create({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    dayOfWeek: data.dayOfWeek,
    timeWindow: data.timeWindow || 'morning',
    monthlyPrice: 50.00,
    stripeSubscriptionId: data.stripeSubscriptionId,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  });

  await generateUpcomingBookings(subscription);
  return subscription;
}

async function generateUpcomingBookings(subscription, weeksAhead = 4) {
  const bookings = [];
  const now = new Date();

  for (let i = 0; i < weeksAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + ((subscription.dayOfWeek - date.getDay() + 7) % 7) + (i * 7));
    if (date <= now) date.setDate(date.getDate() + 7);

    const existing = await Booking.findOne({
      subscriptionId: subscription._id,
      scheduledDate: { $gte: new Date(date.setHours(0, 0, 0, 0)), $lt: new Date(date.setHours(23, 59, 59, 999)) },
    });

    if (!existing) {
      bookings.push(await Booking.create({
        userId: subscription.userId,
        addressId: subscription.addressId,
        serviceTypeId: subscription.serviceTypeId,
        subscriptionId: subscription._id,
        scheduledDate: date,
        timeWindow: subscription.timeWindow,
        status: 'confirmed',
        statusHistory: [{ status: 'confirmed', changedAt: new Date() }],
      }));
    }
  }
  return bookings;
}

async function cancel(subscriptionId, userId, { cancelAtPeriodEnd = true } = {}) {
  const sub = await Subscription.findOne({ _id: subscriptionId, userId });
  if (!sub) {
    const err = new Error('Subscription not found');
    err.status = 404;
    throw err;
  }

  if (cancelAtPeriodEnd) {
    sub.cancelAtPeriodEnd = true;
    await sub.save();
  } else {
    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await sub.save();
    await Booking.updateMany(
      { subscriptionId: sub._id, status: { $in: ['pending', 'confirmed'] }, scheduledDate: { $gte: new Date() } },
      { status: 'cancelled', cancelledAt: new Date() }
    );
  }
  return sub;
}

async function getByUser(userId) {
  return Subscription.find({ userId }).populate('addressId serviceTypeId').sort({ createdAt: -1 });
}

module.exports = { create, cancel, getByUser, generateUpcomingBookings };
