const Booking = require('../models/Booking');
const Address = require('../models/Address');
const ServiceType = require('../models/ServiceType');
const { calculateOneTimePrice } = require('./pricingService');
const stripeService = require('./stripeService');
const config = require('../config');

const DAILY_BOOKING_CAP = 400;
const MAX_BARRELS = 50;

async function create(userId, data) {
  const scheduledDate = new Date(data.scheduledDate);

  if (scheduledDate.getDay() === 0) {
    const err = new Error('Service is not available on Sundays. Please select a day Monday through Saturday.');
    err.status = 400;
    err.code = 'SUNDAY_BLOCKED';
    throw err;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const schedNorm = new Date(scheduledDate);
  schedNorm.setHours(0, 0, 0, 0);
  if (schedNorm < today) {
    const err = new Error('Cannot book a service in the past.');
    err.status = 400;
    err.code = 'PAST_DATE';
    throw err;
  }

  if (data.addressId) {
    const addr = await Address.findOne({ _id: data.addressId, userId });
    if (!addr) {
      const err = new Error('Address not found or does not belong to you.');
      err.status = 403;
      err.code = 'ADDRESS_FORBIDDEN';
      throw err;
    }
  }

  if (data.subscriptionId) {
    const Subscription = require('../models/Subscription');
    const sub = await Subscription.findOne({ _id: data.subscriptionId, userId });
    if (!sub || sub.status !== 'active') {
      const err = new Error('Invalid or inactive subscription');
      err.status = 400;
      err.code = 'INVALID_SUBSCRIPTION';
      throw err;
    }
  }

  const barrelCount = Math.min(MAX_BARRELS, Math.max(1, parseInt(data.barrelCount) || 1));
  const perBarrelAmount = calculateOneTimePrice(barrelCount);
  const isSubscription = !!data.subscriptionId;
  const clientAmount = isSubscription ? 0 : perBarrelAmount;
  const paymentStatus = isSubscription ? 'paid' : 'pending_payment';

  const svcType = await ServiceType.findById(data.serviceTypeId);
  const isBoth = svcType && (svcType.slug === 'both' || (svcType.name || '').toLowerCase().includes('both'));

  const dayStart = new Date(scheduledDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dayFilter = { scheduledDate: { $gte: dayStart, $lt: dayEnd }, status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] } };

  const dailyCount = await Booking.countDocuments(dayFilter);
  if (dailyCount >= DAILY_BOOKING_CAP) {
    const err = new Error('This date is fully booked. Please select another day.');
    err.status = 400;
    err.code = 'DAY_FULL';
    throw err;
  }

  if (isBoth) {
    const [putOutType, bringInType] = await Promise.all([
      ServiceType.findOne({ $or: [{ slug: 'put-out' }, { name: /put-out/i }] }),
      ServiceType.findOne({ $or: [{ slug: 'bring-in' }, { name: /bring-in/i }] }),
    ]);

    const putOutBooking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: putOutType._id,
      scheduledDate,
      barrelCount,
      putOutTime: data.putOutTime,
      amount: clientAmount,
      serviceValue: perBarrelAmount,
      paymentStatus,
      subscriptionId: data.subscriptionId,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    const bringInBooking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: bringInType._id,
      scheduledDate,
      barrelCount,
      bringInTime: data.bringInTime,
      amount: clientAmount,
      serviceValue: perBarrelAmount,
      paymentStatus,
      linkedBookingId: putOutBooking._id,
      subscriptionId: data.subscriptionId,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    putOutBooking.linkedBookingId = bringInBooking._id;
    await putOutBooking.save();

    await putOutBooking.populate(['addressId', 'serviceTypeId']);
    await bringInBooking.populate(['addressId', 'serviceTypeId']);
    return [putOutBooking, bringInBooking];
  }

  const booking = await Booking.create({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    scheduledDate,
    barrelCount,
    putOutTime: data.putOutTime,
    bringInTime: data.bringInTime,
    amount: clientAmount,
    serviceValue: perBarrelAmount,
    paymentStatus,
    subscriptionId: data.subscriptionId,
    statusHistory: [{ status: 'pending', changedAt: new Date() }],
  });
  return booking.populate(['addressId', 'serviceTypeId']);
}

async function listByUser(userId, { status, page = 1, limit = 20, sortBy } = {}) {
  const query = { userId };
  if (status) query.status = status;

  const ALLOWED_SORTS = { completedAt: { completedAt: -1 }, updatedAt: { updatedAt: -1 } };
  const sort = ALLOWED_SORTS[sortBy] || { scheduledDate: -1 };

  const bookings = await Booking.find(query)
    .populate('addressId serviceTypeId assignedTo linkedBookingId')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments(query);
  return { bookings, total, page, pages: Math.ceil(total / limit) };
}

async function getById(bookingId, userId) {
  const booking = await Booking.findOne({
    _id: bookingId,
    $or: [{ userId }, { assignedTo: userId }],
  }).populate('addressId serviceTypeId assignedTo userId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return booking;
}

async function updateStatus(bookingId, newStatus, changedBy) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (!booking.canTransitionTo(newStatus)) {
    const err = new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  booking.status = newStatus;
  booking.statusHistory.push({ status: newStatus, changedAt: new Date(), changedBy });
  if (newStatus === 'completed') booking.completedAt = new Date();
  if (newStatus === 'cancelled') booking.cancelledAt = new Date();
  await booking.save();
  return booking;
}

const GRACE_PERIOD_MS = 2 * 60 * 1000;
const CANCELLATION_FEE = 1.00;

async function cancel(bookingId, userId, reason) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  if (booking.subscriptionId) {
    const err = new Error('Subscription services cannot be individually cancelled. To stop future services, cancel your subscription from your profile.');
    err.status = 400;
    err.code = 'SUBSCRIPTION_NO_CANCEL';
    throw err;
  }

  if (!booking.canTransitionTo('cancelled')) {
    const err = new Error('Booking cannot be cancelled in current state');
    err.status = 400;
    throw err;
  }

  const notYetAccepted = booking.status === 'pending' && !booking.assignedTo;

  if (!notYetAccepted) {
    const hoursUntil = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      const err = new Error('Cannot cancel within 24 hours of scheduled service');
      err.status = 400;
      err.code = 'CANCELLATION_WINDOW';
      throw err;
    }
  }

  const msSinceCreation = Date.now() - new Date(booking.createdAt).getTime();
  const withinGrace = msSinceCreation < GRACE_PERIOD_MS;
  const fee = withinGrace ? 0 : CANCELLATION_FEE;

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationFee = fee;
  booking.cancellationReason = reason || undefined;
  booking.statusHistory.push({ status: 'cancelled', changedAt: new Date(), changedBy: userId });

  if (booking.paymentStatus === 'paid' && booking.stripePaymentIntentId && !config.stripe.skip) {
    try {
      await stripeService.refundPaymentIntent(booking.stripePaymentIntentId, { deductAmountDollars: fee });
      booking.paymentStatus = 'refunded';
    } catch (refundErr) {
      console.error('Refund failed for booking', bookingId, refundErr.message);
    }
  } else if (booking.paymentStatus === 'paid' && config.stripe.skip) {
    booking.paymentStatus = 'refunded';
  }

  await booking.save();

  if (booking.linkedBookingId) {
    const linked = await Booking.findById(booking.linkedBookingId);
    if (linked && linked.canTransitionTo('cancelled')) {
      linked.status = 'cancelled';
      linked.cancelledAt = new Date();
      linked.cancellationFee = 0;
      linked.cancellationReason = booking.cancellationReason;
      if (linked.paymentStatus === 'paid') {
        linked.paymentStatus = 'refunded';
      }
      linked.statusHistory.push({ status: 'cancelled', changedAt: new Date(), changedBy: userId });
      await linked.save();
    }
  }

  return booking;
}

async function reschedule(bookingId, userId, { scheduledDate }) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (!['pending', 'active'].includes(booking.status)) {
    const err = new Error('Can only reschedule pending or confirmed bookings');
    err.status = 400;
    throw err;
  }

  const newDate = new Date(scheduledDate);
  if (newDate.getDay() === 0) {
    const err = new Error('Service is not available on Sundays.');
    err.status = 400;
    throw err;
  }
  const todayR = new Date();
  todayR.setHours(0, 0, 0, 0);
  const newNorm = new Date(newDate);
  newNorm.setHours(0, 0, 0, 0);
  if (newNorm < todayR) {
    const err = new Error('Cannot reschedule to a past date.');
    err.status = 400;
    err.code = 'PAST_DATE';
    throw err;
  }

  booking.scheduledDate = newDate;
  await booking.save();
  return booking;
}

module.exports = { create, listByUser, getById, updateStatus, cancel, reschedule };
