const Booking = require('../models/Booking');
const Address = require('../models/Address');
const ServiceType = require('../models/ServiceType');
const { calculateOneTimePrice, calculateCurbItemPrice } = require('./pricingService');
const stripeService = require('./stripeService');
const config = require('../config');

const DAILY_BOOKING_CAP = 400;
const MAX_BARRELS = 50;
const GRACE_PERIOD_MS = 2 * 60 * 1000;
const CANCELLATION_FEE = 1.00;

function todayInEastern() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

async function create(userId, data) {
  const scheduledDate = new Date(data.scheduledDate + 'T12:00:00');

  if (scheduledDate.getDay() === 0) {
    const err = new Error('Service is not available on Sundays. Please select a day Monday through Saturday.');
    err.status = 400;
    err.code = 'SUNDAY_BLOCKED';
    throw err;
  }

  const dateStr = data.scheduledDate;
  const todayStr = todayInEastern();
  if (dateStr < todayStr) {
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

  const svcType = await ServiceType.findById(data.serviceTypeId);
  const isCurbItems = svcType && svcType.slug === 'curb-items';
  const isBoth = svcType && svcType.slug === 'both';

  if (isCurbItems) {
    const itemCount = Math.min(10, Math.max(1, parseInt(data.itemCount) || 1));
    if (!data.curbItemPhotos || data.curbItemPhotos.length === 0) {
      const err = new Error('At least one photo of the item(s) is required for Curb Items service.');
      err.status = 400;
      err.code = 'PHOTOS_REQUIRED';
      throw err;
    }

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

    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate,
      itemCount,
      curbItemPhotos: data.curbItemPhotos,
      curbItemNotes: data.curbItemNotes || '',
      amount: calculateCurbItemPrice(itemCount),
      serviceValue: calculateCurbItemPrice(itemCount),
      paymentStatus: 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  const barrelCount = Math.min(MAX_BARRELS, Math.max(1, parseInt(data.barrelCount) || 1));
  const perBarrelAmount = calculateOneTimePrice(barrelCount);
  const isSubscription = !!data.subscriptionId;
  const clientAmount = isSubscription ? 0 : perBarrelAmount;
  const paymentStatus = isSubscription ? 'paid' : 'pending_payment';

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
      ServiceType.findOne({ slug: 'put-out' }),
      ServiceType.findOne({ slug: 'bring-in' }),
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

  const elapsed = Date.now() - new Date(booking.createdAt).getTime();
  const pastGrace = elapsed > GRACE_PERIOD_MS;
  let cancellationFeeCharged = false;

  if (pastGrace && !config.stripe.skip) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (user) {
      try {
        await stripeService.chargeOffSession(user, CANCELLATION_FEE, `cancel-${booking._id}`, {
          description: 'Cancellation fee',
        });
        cancellationFeeCharged = true;
      } catch (err) {
        console.error(`[Cancel] Failed to charge cancellation fee for booking ${booking._id}:`, err.message);
      }
    }
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason || undefined;
  booking.cancellationFee = cancellationFeeCharged ? CANCELLATION_FEE : 0;
  booking.statusHistory.push({ status: 'cancelled', changedAt: new Date(), changedBy: userId });
  await booking.save();

  if (booking.linkedBookingId) {
    const linked = await Booking.findById(booking.linkedBookingId);
    if (linked && linked.canTransitionTo('cancelled')) {
      linked.status = 'cancelled';
      linked.cancelledAt = new Date();
      linked.cancellationReason = booking.cancellationReason;
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

  const newDate = new Date(scheduledDate + 'T12:00:00');
  if (newDate.getDay() === 0) {
    const err = new Error('Service is not available on Sundays.');
    err.status = 400;
    throw err;
  }
  if (scheduledDate < todayInEastern()) {
    const err = new Error('Cannot reschedule to a past date.');
    err.status = 400;
    err.code = 'PAST_DATE';
    throw err;
  }

  booking.scheduledDate = newDate;
  await booking.save();
  return booking;
}

async function chargeBookingOnCompletion(bookingId) {
  const User = require('../models/User');
  const ServiceType = require('../models/ServiceType');
  const Address = require('../models/Address');
  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  if (booking.paymentStatus === 'paid') return;
  if (booking.subscriptionId) return;
  if (!booking.amount || booking.amount <= 0) return;
  if (config.stripe.skip) {
    booking.paymentStatus = 'paid';
    await booking.save();
    return;
  }

  const user = await User.findById(booking.userId);
  if (!user) return;

  const svcType = await ServiceType.findById(booking.serviceTypeId);
  const addr = await Address.findById(booking.addressId);
  const svcName = svcType?.name || 'Service';
  const city = addr?.city || '';
  const dateStr = booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const isCurbItem = svcType && svcType.slug === 'curb-items';
  const countLabel = isCurbItem
    ? `${booking.itemCount || 1} item${(booking.itemCount || 1) > 1 ? 's' : ''}`
    : `${booking.barrelCount || 1} barrel${(booking.barrelCount || 1) > 1 ? 's' : ''}`;
  const desc = `${svcName}${city ? ` — ${city}` : ''}${dateStr ? ` (${dateStr})` : ''} — ${countLabel}`;

  try {
    const intent = await stripeService.chargeOffSession(user, booking.amount, booking._id.toString(), { description: desc });
    booking.stripePaymentIntentId = intent.id;
    booking.paymentStatus = 'paid';
    await booking.save();

    if (booking.linkedBookingId) {
      const linked = await Booking.findById(booking.linkedBookingId);
      if (linked && linked.paymentStatus !== 'paid') {
        linked.stripePaymentIntentId = intent.id;
        linked.paymentStatus = 'paid';
        await linked.save();
      }
    }
  } catch (err) {
    console.error(`[Stripe] Off-session charge failed for booking ${bookingId}:`, err.message);
    booking.paymentStatus = 'charge_failed';
    await booking.save();
  }
}

function parseTimeWindowEnd(timeStr, scheduledDate, isBringIn) {
  const base = new Date(scheduledDate);
  if (isBringIn) base.setDate(base.getDate() + 1);

  const hourMap = {
    '4–9 PM': 21,
    '5–7 AM': 7,
    '12–4 PM': 16,
    '5–7 PM': 19,
    '7–9 PM': 21,
    '9–11 PM': 23,
  };

  if (timeStr) {
    for (const [key, hour] of Object.entries(hourMap)) {
      if (timeStr.includes(key)) {
        base.setHours(hour, 0, 0, 0);
        return base;
      }
    }
  }

  base.setHours(23, 59, 0, 0);
  return base;
}

async function expireOverdueBookings(io) {
  const notificationService = require('./notificationService');
  const now = new Date();

  const candidates = await Booking.find({
    status: { $in: ['pending', 'active'] },
    scheduledDate: { $lte: now },
  }).populate('serviceTypeId');

  let expired = 0;
  for (const booking of candidates) {
    const slug = booking.serviceTypeId?.slug || '';
    const isBringIn = slug === 'bring-in';
    const timeStr = isBringIn ? booking.bringInTime : booking.putOutTime;
    const expiryTime = parseTimeWindowEnd(timeStr, booking.scheduledDate, isBringIn);

    if (now <= expiryTime) continue;

    booking.status = 'expired';
    booking.statusHistory.push({ status: 'expired', changedAt: now });
    await booking.save();
    expired++;

    const svcName = booking.serviceTypeId?.name || 'Service';
    const dateLabel = new Date(booking.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    notificationService.create({
      userId: booking.userId,
      type: 'booking:expired',
      title: 'Request could not be completed',
      body: `Your ${svcName} request for ${dateLabel} could not be completed. You have not been charged.`,
      bookingId: booking._id,
    }).catch(() => {});

    if (io) {
      io.of('/notifications').to(`user:${booking.userId}`).emit('booking:expired', {
        bookingId: booking._id.toString(),
        message: `Your ${svcName} request for ${dateLabel} could not be completed.`,
      });
    }
  }

  if (expired > 0) console.log(`[Expiry] Expired ${expired} overdue booking(s)`);
}

module.exports = { create, listByUser, getById, updateStatus, cancel, reschedule, chargeBookingOnCompletion, expireOverdueBookings };
