const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const ServiceType = require('../models/ServiceType');
const User = require('../models/User');
const stripeService = require('./stripeService');
const config = require('../config');
const { calculateMonthlyPrice, calculateMonthlyPriceBoth, calculateOneTimePrice, calculateOneTimePriceBothLeg, calculateEntranceCleaningMonthlyPrice, calculateEntranceCleaningPrice } = require('./pricingService');

async function create(userId, data) {
  const existing = await Subscription.findOne({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    status: { $in: ['active', 'past_due', 'trialing'] },
  });
  if (existing) {
    const err = new Error('You already have an active subscription for this service at this address. Cancel it first to start a new one.');
    err.status = 409;
    err.code = 'DUPLICATE_SUBSCRIPTION';
    throw err;
  }

  const svcType = await ServiceType.findById(data.serviceTypeId);
  if (!svcType) {
    const err = new Error('Invalid service type.');
    err.status = 400;
    err.code = 'INVALID_SERVICE_TYPE';
    throw err;
  }

  const isEntranceCleaning = svcType.slug === 'entrance-cleaning';

  if (isEntranceCleaning) {
    const floors = parseInt(data.floors);
    if (!floors || floors < 1) {
      const err = new Error('Number of floors is required and must be at least 1.');
      err.status = 400;
      err.code = 'FLOORS_REQUIRED';
      throw err;
    }
    const staircases = parseInt(data.staircases) || 0;
    const frontEntrance = !!data.frontEntrance;
    const backEntrance = !!data.backEntrance;
    const monthlyPrice = calculateEntranceCleaningMonthlyPrice({ floors, staircases, frontEntrance, backEntrance });

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
      floors,
      staircases,
      frontEntrance,
      backEntrance,
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

  const barrelCount = Math.max(1, parseInt(data.barrelCount) || 1);

  const isBoth = svcType.slug === 'both' || (svcType.name || '').toLowerCase().includes('both');
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
    batchId: data.batchId,
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

  const svcType = await ServiceType.findById(subscription.serviceTypeId);

  if (svcType && svcType.slug === 'entrance-cleaning') {
    const floors = subscription.floors || 1;
    const staircases = subscription.staircases || 0;
    const frontEntrance = !!subscription.frontEntrance;
    const backEntrance = !!subscription.backEntrance;
    const visitPrice = calculateEntranceCleaningPrice({ floors, staircases, frontEntrance, backEntrance });

    const taskKeys = [];
    for (let i = 1; i <= floors; i++) taskKeys.push(`floor-${i}`);
    if (staircases > 0) taskKeys.push('stairs');
    if (frontEntrance) taskKeys.push('front-entrance');
    if (backEntrance) taskKeys.push('back-entrance');

    const daysUntilNext = (subscription.dayOfWeek - now.getDay() + 7) % 7;
    const firstDate = new Date(now);
    firstDate.setDate(firstDate.getDate() + daysUntilNext);
    firstDate.setHours(12, 0, 0, 0);

    for (let visit = 0; visit < 2; visit++) {
      const visitDate = new Date(firstDate);
      visitDate.setDate(visitDate.getDate() + visit * 14);

      const dedupStart = new Date(visitDate);
      dedupStart.setHours(0, 0, 0, 0);
      const dedupEnd = new Date(dedupStart);
      dedupEnd.setDate(dedupEnd.getDate() + 1);

      const existing = await Booking.findOne({
        subscriptionId: subscription._id,
        scheduledDate: { $gte: dedupStart, $lt: dedupEnd },
      });

      if (!existing) {
        bookings.push(await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: subscription.serviceTypeId,
          subscriptionId: subscription._id,
          scheduledDate: visitDate,
          floors,
          staircases,
          frontEntrance,
          backEntrance,
          taskProgress: [],
          amount: 0,
          serviceValue: visitPrice,
          paymentStatus: 'paid',
          status: 'pending',
          statusHistory: [{ status: 'pending', changedAt: new Date() }],
        }));
      }
    }

    return bookings;
  }

  const barrelCount = Math.min(50, Math.max(1, subscription.barrelCount || 1));

  const isBoth = svcType && (svcType.slug === 'both' || (svcType.name || '').toLowerCase().includes('both'));
  const perVisit = isBoth ? calculateOneTimePriceBothLeg(barrelCount) : calculateOneTimePrice(barrelCount);

  let putOutType, bringInType;
  if (isBoth) {
    [putOutType, bringInType] = await Promise.all([
      ServiceType.findOne({ slug: 'put-out' }),
      ServiceType.findOne({ slug: 'bring-in' }),
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

    // Dedup check spans Sunday–Tuesday so it catches both put-out (night before) and bring-in (trash day).
    const dedupStart = new Date(dayStart);
    dedupStart.setDate(dedupStart.getDate() - 1);

    const existing = await Booking.findOne({
      subscriptionId: subscription._id,
      scheduledDate: { $gte: dedupStart, $lt: dayEnd },
    });

    // Put-out service happens the evening before the trash day.
    const putOutDate = new Date(date);
    putOutDate.setDate(putOutDate.getDate() - 1);

    if (!existing) {
      if (isBoth) {
        const putOutBooking = await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: putOutType._id,
          subscriptionId: subscription._id,
          scheduledDate: putOutDate,
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
        const isSubPutOut = svcType && svcType.slug === 'put-out';
        bookings.push(await Booking.create({
          userId: subscription.userId,
          addressId: subscription.addressId,
          serviceTypeId: subscription.serviceTypeId,
          subscriptionId: subscription._id,
          scheduledDate: isSubPutOut ? putOutDate : date,
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

async function toggleAutoRenew(subscriptionId, userId, autoRenew) {
  const sub = await Subscription.findOne({ _id: subscriptionId, userId });
  if (!sub) {
    const err = new Error('Subscription not found');
    err.status = 404;
    throw err;
  }
  if (sub.status === 'cancelled') {
    const err = new Error('Cannot modify a cancelled subscription');
    err.status = 400;
    err.code = 'SUBSCRIPTION_CANCELLED';
    throw err;
  }

  sub.cancelAtPeriodEnd = !autoRenew;
  await sub.save();

  if (!config.stripe.skip && sub.stripeSubscriptionId) {
    await stripeService.updateSubscription(sub.stripeSubscriptionId, {
      cancel_at_period_end: !autoRenew,
    });
  }

  return sub;
}

async function cancel(subscriptionId, userId) {
  const sub = await Subscription.findOne({ _id: subscriptionId, userId });
  if (!sub) {
    const err = new Error('Subscription not found');
    err.status = 404;
    throw err;
  }

  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  await sub.save();

  if (!config.stripe.skip && sub.stripeSubscriptionId) {
    try { await stripeService.cancelSubscription(sub.stripeSubscriptionId); } catch (e) {
      console.error('Stripe subscription cancel failed:', e.message);
    }
  }

  await Booking.updateMany(
    { subscriptionId: sub._id, status: { $in: ['pending', 'active'] }, scheduledDate: { $gte: new Date() } },
    { status: 'cancelled', cancelledAt: new Date() },
  );

  return sub;
}

async function cancelBatch(batchId, userId) {
  const subs = await Subscription.find({ batchId, userId, status: { $nin: ['cancelled'] } });
  if (subs.length === 0) {
    const err = new Error('No active subscriptions found for this batch.');
    err.status = 404;
    throw err;
  }

  const results = [];
  const errors = [];

  for (const sub of subs) {
    try {
      const cancelled = await cancel(sub._id, userId);
      results.push(cancelled);
    } catch (err) {
      errors.push({ subscriptionId: sub._id, error: err.message });
    }
  }

  return { cancelled: results, errors };
}

async function getByUser(userId) {
  return Subscription.find({ userId }).populate('addressId serviceTypeId').sort({ createdAt: -1 });
}

module.exports = { create, cancel, cancelBatch, toggleAutoRenew, getByUser, generateUpcomingBookings };
