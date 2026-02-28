const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const ServiceType = require('../models/ServiceType');
const User = require('../models/User');
const stripeService = require('./stripeService');
const config = require('../config');
const { calculateMonthlyPrice, calculateMonthlyPriceBoth, calculateOneTimePrice } = require('./pricingService');

async function create(userId, data) {
  const barrelCount = Math.max(1, parseInt(data.barrelCount) || 1);

  const svcType = await ServiceType.findById(data.serviceTypeId);
  const isBoth = svcType && (svcType.slug === 'both' || (svcType.name || '').toLowerCase().includes('both'));
  const monthlyPrice = isBoth
    ? calculateMonthlyPriceBoth(barrelCount)
    : calculateMonthlyPrice(barrelCount);

  let stripeSubscriptionId = null;
  let stripePriceId = null;
  let clientSecret = null;

  if (!config.stripe.skip) {
    const user = await User.findById(userId);
    const price = await stripeService.getOrCreatePrice(monthlyPrice);
    stripePriceId = price.id;

    const stripeSub = await stripeService.createStripeSubscription(user, price.id, {
      userId: userId.toString(),
      serviceTypeId: data.serviceTypeId,
    });

    stripeSubscriptionId = stripeSub.id;
    clientSecret = stripeSub.latest_invoice?.payment_intent?.client_secret || null;
  } else {
    clientSecret = 'dev_mock_secret';
  }

  const subscription = await Subscription.create({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    dayOfWeek: data.dayOfWeek,
    barrelCount,
    putOutTime: data.putOutTime || '',
    bringInTime: data.bringInTime || '',
    monthlyPrice,
    stripeSubscriptionId,
    stripePriceId,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  });

  if (config.stripe.skip) {
    await generateUpcomingBookings(subscription);
  }

  return { subscription, clientSecret };
}

async function generateUpcomingBookings(subscription, weeksAhead = 4) {
  if (subscription.status && subscription.status !== 'active') {
    return [];
  }

  const bookings = [];
  const now = new Date();
  const barrelCount = Math.min(50, Math.max(1, subscription.barrelCount || 1));
  const perVisit = calculateOneTimePrice(barrelCount);

  const svcType = await ServiceType.findById(subscription.serviceTypeId);
  const isBoth = svcType && (svcType.slug === 'both' || (svcType.name || '').toLowerCase().includes('both'));

  let putOutType, bringInType;
  if (isBoth) {
    [putOutType, bringInType] = await Promise.all([
      ServiceType.findOne({ $or: [{ slug: 'put-out' }, { name: /put-out/i }] }),
      ServiceType.findOne({ $or: [{ slug: 'bring-in' }, { name: /bring-in/i }] }),
    ]);
  }

  for (let i = 0; i < weeksAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + ((subscription.dayOfWeek - date.getDay() + 7) % 7) + (i * 7));
    if (date <= now) date.setDate(date.getDate() + 7);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await Booking.findOne({
      subscriptionId: subscription._id,
      scheduledDate: { $gte: dayStart, $lt: dayEnd },
    });

    if (!existing) {
      if (isBoth) {
        const putOutBooking = await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: putOutType._id,
          subscriptionId: subscription._id,
          scheduledDate: date,
          barrelCount,
          putOutTime: subscription.putOutTime || '',
          amount: 0,
          serviceValue: perVisit,
          paymentStatus: 'paid',
          status: 'pending',
          statusHistory: [{ status: 'pending', changedAt: new Date() }],
        });

        const bringInBooking = await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: bringInType._id,
          subscriptionId: subscription._id,
          scheduledDate: date,
          barrelCount,
          bringInTime: subscription.bringInTime || '',
          amount: 0,
          serviceValue: perVisit,
          paymentStatus: 'paid',
          linkedBookingId: putOutBooking._id,
          status: 'pending',
          statusHistory: [{ status: 'pending', changedAt: new Date() }],
        });

        putOutBooking.linkedBookingId = bringInBooking._id;
        await putOutBooking.save();

        bookings.push(putOutBooking, bringInBooking);
      } else {
        bookings.push(await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: subscription.serviceTypeId,
          subscriptionId: subscription._id,
          scheduledDate: date,
          barrelCount,
          putOutTime: subscription.putOutTime || '',
          bringInTime: subscription.bringInTime || '',
          amount: 0,
          serviceValue: perVisit,
          paymentStatus: 'paid',
          status: 'pending',
          statusHistory: [{ status: 'pending', changedAt: new Date() }],
        }));
      }
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
      { subscriptionId: sub._id, status: { $in: ['pending', 'active'] }, scheduledDate: { $gte: new Date() } },
      { status: 'cancelled', cancelledAt: new Date() }
    );
  }
  return sub;
}

async function getByUser(userId) {
  return Subscription.find({ userId }).populate('addressId serviceTypeId').sort({ createdAt: -1 });
}

module.exports = { create, cancel, getByUser, generateUpcomingBookings };
