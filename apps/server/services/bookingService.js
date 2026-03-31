const Booking = require('../models/Booking');
const Address = require('../models/Address');
const ServiceType = require('../models/ServiceType');
const AppSettings = require('../models/AppSettings');
const {
  calculateOneTimePrice,
  calculateOneTimePriceBothLeg,
  calculateCurbItemPrice,
  calculateEntranceCleaningPrice,
  calculateBarrelCleaningPrice,
  calculateCleanoutPrice,
  OUTDOOR_LAWN,
  OUTDOOR_LEAVES,
  OUTDOOR_SHOVEL,
} = require('./pricingService');
const stripeService = require('./stripeService');
const config = require('../config');
const MAX_BARRELS = 50;
const GRACE_PERIOD_MS = 2 * 60 * 1000;
const CANCELLATION_FEE = 1.00;

function todayInEastern() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

const PROMO_CREDIT_EXPIRY = new Date('2026-04-30T23:59:59.000-04:00');
const PROMO_CREDIT_INITIAL = 15;

async function resolvePromoCredit(userId, requestedCredit) {
  if (!requestedCredit || requestedCredit <= 0) return 0;
  const User = require('../models/User');

  const user = await User.findById(userId).select('promoCredit');
  if (!user) return 0;

  let balance, expiry;
  if (!user.promoCredit || user.promoCredit.balance == null) {
    await User.findByIdAndUpdate(userId, {
      $set: { promoCredit: { balance: PROMO_CREDIT_INITIAL, expiresAt: PROMO_CREDIT_EXPIRY } },
    });
    balance = PROMO_CREDIT_INITIAL;
    expiry = PROMO_CREDIT_EXPIRY;
  } else {
    balance = user.promoCredit.balance;
    expiry = user.promoCredit.expiresAt;
  }

  if (new Date() > new Date(expiry)) return 0;
  if (balance <= 0) return 0;

  const creditToApply = Math.min(parseFloat(requestedCredit), balance);

  await User.findByIdAndUpdate(userId, {
    $inc: { 'promoCredit.balance': -creditToApply },
  });

  return creditToApply;
}

async function create(userId, data) {
  const scheduledDate = new Date(data.scheduledDate + 'T12:00:00');

  // Put-out service happens the evening BEFORE the trash day.
  const putOutDate = new Date(scheduledDate);
  putOutDate.setDate(putOutDate.getDate() - 1);

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

  const isSubscriptionBooking = !!data.subscriptionId;
  const creditResolved = !isSubscriptionBooking ? await resolvePromoCredit(userId, parseFloat(data.promoCreditApplied) || 0) : 0;

  const svcType = await ServiceType.findById(data.serviceTypeId);
  const isCurbItems = svcType && svcType.slug === 'curb-items';
  const isBoth = svcType && svcType.slug === 'both';
  const isPutOut = svcType && svcType.slug === 'put-out';
  const isEntranceCleaning = svcType && svcType.slug === 'entrance-cleaning';

  if (scheduledDate.getDay() === 0) {
    const err = new Error('Service is not available on Sundays. Please select a day Monday through Saturday.');
    err.status = 400;
    err.code = 'SUNDAY_BLOCKED';
    throw err;
  }

  if (isEntranceCleaning) {
    const floors = parseInt(data.floors);
    const staircases = parseInt(data.staircases) || 0;
    if (!floors || floors < 1) {
      const err = new Error('Number of floors is required and must be at least 1.');
      err.status = 400;
      err.code = 'FLOORS_REQUIRED';
      throw err;
    }
    const frontEntrance = !!data.frontEntrance;
    const backEntrance = !!data.backEntrance;
    const amount = calculateEntranceCleaningPrice({ floors, staircases, frontEntrance, backEntrance });

    const ecSettings = await AppSettings.get();
    if (ecSettings.entranceCleaningDailyCap > 0) {
      const ecDayStart = new Date(scheduledDate);
      ecDayStart.setHours(0, 0, 0, 0);
      const ecDayEnd = new Date(ecDayStart);
      ecDayEnd.setDate(ecDayEnd.getDate() + 1);
      const ecBooked = await Booking.countDocuments({
        scheduledDate: { $gte: ecDayStart, $lt: ecDayEnd },
        serviceTypeId: data.serviceTypeId,
        status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] },
      });
      if (ecBooked >= ecSettings.entranceCleaningDailyCap) {
        const err = new Error('Entrance cleaning is fully booked for this date. Please select another day.');
        err.status = 400;
        err.code = 'DAY_FULL';
        throw err;
      }
    }

    const taskKeys = [];
    for (let i = 1; i <= floors; i++) taskKeys.push(`floor-${i}`);
    if (staircases > 0) taskKeys.push('stairs');
    if (frontEntrance) taskKeys.push('front-entrance');
    if (backEntrance) taskKeys.push('back-entrance');

    const cleaningAreaPhotos = Array.isArray(data.cleaningAreaPhotos) ? data.cleaningAreaPhotos : [];
    const ecCredit = Math.min(creditResolved, amount);
    const ecNetAmount = Math.max(0, amount - ecCredit);

    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate,
      floors,
      staircases,
      frontEntrance,
      backEntrance,
      taskProgress: [],
      cleaningAreaPhotos,
      amount: ecNetAmount,
      serviceValue: amount,
      promoCreditApplied: ecCredit,
      paymentStatus: ecNetAmount === 0 ? 'paid' : 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  if (isCurbItems) {
    const itemCount = Math.min(10, Math.max(1, parseInt(data.itemCount) || 1));
    if (!data.curbItemPhotos || data.curbItemPhotos.length === 0) {
      const err = new Error('At least one photo of the item(s) is required for Curb Items service.');
      err.status = 400;
      err.code = 'PHOTOS_REQUIRED';
      throw err;
    }

    const settings = await AppSettings.get();
    const dayStart = new Date(putOutDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayFilter = { scheduledDate: { $gte: dayStart, $lt: dayEnd }, status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] } };
    const dailyCount = await Booking.countDocuments(dayFilter);
    if (dailyCount >= settings.dailyBookingCap) {
      const err = new Error('This date is fully booked. Please select another day.');
      err.status = 400;
      err.code = 'DAY_FULL';
      throw err;
    }

    const curbGross = calculateCurbItemPrice(itemCount);
    const curbCredit = Math.min(creditResolved, curbGross);
    const curbNetAmount = Math.max(0, curbGross - curbCredit);

    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate: putOutDate,
      itemCount,
      curbItemPhotos: data.curbItemPhotos,
      curbItemNotes: data.curbItemNotes || '',
      amount: curbNetAmount,
      serviceValue: curbGross,
      promoCreditApplied: curbCredit,
      paymentStatus: curbNetAmount === 0 ? 'paid' : 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  const isBarrelCleaning = svcType && svcType.slug === 'barrel-cleaning';
  const isPropertyCleanout = svcType && svcType.slug === 'property-cleanout';
  const isOutdoorService = svcType && ['lawn-care', 'leaf-cleanup', 'snow-shoveling'].includes(svcType.slug);

  if (isBarrelCleaning) {
    const count = Math.max(1, parseInt(data.itemCount) || 1);
    const bcGross = calculateBarrelCleaningPrice(count);
    const bcCredit = Math.min(creditResolved, bcGross);
    const bcNet = Math.max(0, bcGross - bcCredit);
    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate,
      itemCount: count,
      curbItemNotes: data.curbItemNotes || '',
      amount: bcNet,
      serviceValue: bcGross,
      promoCreditApplied: bcCredit,
      paymentStatus: bcNet === 0 ? 'paid' : 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  if (isPropertyCleanout) {
    const bedrooms = Math.max(1, parseInt(data.itemCount) || 1);
    const coGross = calculateCleanoutPrice(bedrooms);
    const coCredit = Math.min(creditResolved, coGross);
    const coNet = Math.max(0, coGross - coCredit);
    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate,
      itemCount: bedrooms,
      curbItemNotes: data.curbItemNotes || '',
      amount: coNet,
      serviceValue: coGross,
      promoCreditApplied: coCredit,
      paymentStatus: coNet === 0 ? 'paid' : 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  if (isOutdoorService) {
    const notesStr = (data.curbItemNotes || '').toLowerCase();
    const lotSize = notesStr.includes('medium') ? 'medium' : notesStr.includes('large') ? 'large' : 'small';
    const tiers = svcType.slug === 'lawn-care' ? OUTDOOR_LAWN
      : svcType.slug === 'leaf-cleanup' ? OUTDOOR_LEAVES
      : OUTDOOR_SHOVEL;
    const outGross = tiers[lotSize] ?? tiers.small;
    const outCredit = Math.min(creditResolved, outGross);
    const outNet = Math.max(0, outGross - outCredit);
    const booking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: data.serviceTypeId,
      scheduledDate,
      curbItemNotes: data.curbItemNotes || '',
      amount: outNet,
      serviceValue: outGross,
      promoCreditApplied: outCredit,
      paymentStatus: outNet === 0 ? 'paid' : 'pending_payment',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });
    return booking.populate(['addressId', 'serviceTypeId']);
  }

  const barrelCount = Math.min(MAX_BARRELS, Math.max(1, parseInt(data.barrelCount) || 1));
  const perBarrelAmount = isBoth
    ? calculateOneTimePriceBothLeg(barrelCount)
    : calculateOneTimePrice(barrelCount);
  const isSubscription = !!data.subscriptionId;
  const isGuaranteed = isSubscription || !!data.isGuaranteed;
  const clientAmount = isSubscription ? 0 : perBarrelAmount;
  const paymentStatus = isSubscription ? 'paid' : 'pending_payment';

  const settings = await AppSettings.get();
  const dayStart = new Date(scheduledDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dayFilter = { scheduledDate: { $gte: dayStart, $lt: dayEnd }, status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] } };

  if (!isGuaranteed) {
    const dailyCount = await Booking.countDocuments(dayFilter);
    if (dailyCount >= settings.dailyBookingCap) {
      const err = new Error('This date is fully booked. Please select another day.');
      err.status = 400;
      err.code = 'DAY_FULL';
      throw err;
    }
  }

  if (isBoth) {
    const [putOutType, bringInType] = await Promise.all([
      ServiceType.findOne({ slug: 'put-out' }),
      ServiceType.findOne({ slug: 'bring-in' }),
    ]);

    if (!putOutType || !bringInType) {
      const err = new Error('Service configuration error: put-out or bring-in service type not found.');
      err.status = 500;
      err.code = 'SERVICE_TYPE_MISSING';
      throw err;
    }

    const bothCredit = Math.min(creditResolved, clientAmount);
    const bothNetAmount = Math.max(0, clientAmount - bothCredit);
    const bothPaymentStatus = isSubscriptionBooking ? paymentStatus : (bothNetAmount === 0 ? 'paid' : 'pending_payment');

    const putOutBooking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: putOutType._id,
      scheduledDate: putOutDate,
      barrelCount,
      putOutTime: data.putOutTime,
      amount: bothNetAmount,
      serviceValue: perBarrelAmount,
      promoCreditApplied: bothCredit,
      paymentStatus: bothPaymentStatus,
      subscriptionId: data.subscriptionId,
      batchId: data.batchId,
      isGuaranteed,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    const bringInBooking = await Booking.create({
      userId,
      addressId: data.addressId,
      serviceTypeId: bringInType._id,
      scheduledDate,
      barrelCount,
      bringInTime: data.bringInTime,
      amount: bothNetAmount,
      serviceValue: perBarrelAmount,
      paymentStatus: bothPaymentStatus,
      linkedBookingId: putOutBooking._id,
      subscriptionId: data.subscriptionId,
      batchId: data.batchId,
      isGuaranteed,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    putOutBooking.linkedBookingId = bringInBooking._id;
    await putOutBooking.save();

    await putOutBooking.populate(['addressId', 'serviceTypeId']);
    await bringInBooking.populate(['addressId', 'serviceTypeId']);
    return [putOutBooking, bringInBooking];
  }

  const barrelCredit = Math.min(creditResolved, clientAmount);
  const barrelNetAmount = Math.max(0, clientAmount - barrelCredit);
  const barrelPaymentStatus = isSubscriptionBooking ? paymentStatus : (barrelNetAmount === 0 ? 'paid' : 'pending_payment');

  const booking = await Booking.create({
    userId,
    addressId: data.addressId,
    serviceTypeId: data.serviceTypeId,
    scheduledDate: isPutOut ? putOutDate : scheduledDate,
    barrelCount,
    putOutTime: data.putOutTime,
    bringInTime: data.bringInTime,
    amount: barrelNetAmount,
    serviceValue: perBarrelAmount,
    promoCreditApplied: barrelCredit,
    paymentStatus: barrelPaymentStatus,
    subscriptionId: data.subscriptionId,
    batchId: data.batchId,
    isGuaranteed,
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
    const notificationService = require('./notificationService');
    const { sendPaymentSuccessEmail } = require('./paymentEmailService');
    const user = await User.findById(userId);
    if (user) {
      try {
        const intent = await stripeService.chargeOffSession(user, CANCELLATION_FEE, `cancel-${booking._id}`, {
          description: 'Cancellation fee',
        });
        cancellationFeeCharged = true;
        notificationService.create({
          userId: booking.userId,
          type: 'booking:payment',
          title: 'Cancellation fee charged',
          body: `A $${CANCELLATION_FEE.toFixed(2)} cancellation fee has been charged for your cancelled service.`,
          bookingId: booking._id,
        }).catch(() => {});

        const charges = intent.charges?.data || (intent.latest_charge ? [intent.latest_charge] : []);
        const cardDetails = charges[0]?.payment_method_details?.card || {};
        sendPaymentSuccessEmail(user, {
          amount: CANCELLATION_FEE,
          description: 'Cancellation fee',
          cardBrand: cardDetails.brand || 'card',
          cardLast4: cardDetails.last4 || '••••',
        });
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

  // For "both" (put-out + bring-in) pairs, determine which leg this is and
  // move the other leg's date accordingly: put-out is always the night before.
  if (booking.linkedBookingId) {
    const linked = await Booking.findById(booking.linkedBookingId);
    if (linked && ['pending', 'active'].includes(linked.status)) {
      const svcType = await ServiceType.findById(booking.serviceTypeId);
      const isPutOut = svcType?.slug === 'put-out';
      if (isPutOut) {
        // put-out moved → bring-in moves to the next day
        const bringInDate = new Date(newDate);
        bringInDate.setDate(bringInDate.getDate() + 1);
        linked.scheduledDate = bringInDate;
      } else {
        // bring-in moved → put-out moves to the evening before
        const putOutDate = new Date(newDate);
        putOutDate.setDate(putOutDate.getDate() - 1);
        linked.scheduledDate = putOutDate;
      }
      await linked.save();
    }
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
    const notifSvc = require('./notificationService');
    const svc = await ServiceType.findById(booking.serviceTypeId);
    notifSvc.create({
      userId: booking.userId,
      type: 'booking:payment',
      title: 'Payment confirmed',
      body: `$${booking.amount.toFixed(2)} charged for ${svc?.name || 'Service'}. Thank you!`,
      bookingId: booking._id,
    }).catch(() => {});
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
  const isEntranceCleaning = svcType && svcType.slug === 'entrance-cleaning';
  let countLabel;
  if (isCurbItem) {
    countLabel = `${booking.itemCount || 1} item${(booking.itemCount || 1) > 1 ? 's' : ''}`;
  } else if (isEntranceCleaning) {
    const parts = [`${booking.floors || 1} floor${(booking.floors || 1) > 1 ? 's' : ''}`];
    if (booking.staircases > 0) parts.push(`${booking.staircases} staircase${booking.staircases > 1 ? 's' : ''}`);
    if (booking.frontEntrance) parts.push('front entrance');
    if (booking.backEntrance) parts.push('back entrance');
    countLabel = parts.join(', ');
  } else {
    countLabel = `${booking.barrelCount || 1} barrel${(booking.barrelCount || 1) > 1 ? 's' : ''}`;
  }
  const desc = `${svcName}${city ? ` (${city})` : ''}${dateStr ? ` ${dateStr}` : ''} — ${countLabel}`;

  const notificationService = require('./notificationService');
  const { sendPaymentSuccessEmail, sendPaymentFailedEmail } = require('./paymentEmailService');

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

    notificationService.create({
      userId: booking.userId,
      type: 'booking:payment',
      title: 'Payment confirmed',
      body: `$${booking.amount.toFixed(2)} charged for ${desc}. Thank you!`,
      bookingId: booking._id,
    }).catch(() => {});

    const charges = intent.charges?.data || (intent.latest_charge ? [intent.latest_charge] : []);
    const cardDetails = charges[0]?.payment_method_details?.card || {};
    sendPaymentSuccessEmail(user, {
      amount: booking.amount,
      description: desc,
      cardBrand: cardDetails.brand || 'card',
      cardLast4: cardDetails.last4 || '••••',
    });
  } catch (err) {
    console.error(`[Stripe] Off-session charge failed for booking ${bookingId}:`, err.message);

    if (err.raw?.payment_intent?.id) {
      booking.stripePaymentIntentId = err.raw.payment_intent.id;
    }
    booking.paymentStatus = 'charge_failed';
    await booking.save();

    const isAuthRequired = err.code === 'authentication_required' || err.raw?.payment_intent?.status === 'requires_action';
    notificationService.create({
      userId: booking.userId,
      type: 'booking:payment',
      title: 'Payment requires action',
      body: isAuthRequired
        ? `Your bank requires verification for the $${booking.amount.toFixed(2)} charge. Please open the app and complete payment.`
        : `We couldn't process payment for your ${svcName} service. Please update your card in your Profile.`,
      bookingId: booking._id,
    }).catch(() => {});

    sendPaymentFailedEmail(user, { description: desc });
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

async function getCapacity(dateStr, { count = 1, isSubscriber = false } = {}) {
  if (isSubscriber) return { date: dateStr, booked: 0, cap: 0, available: true, guaranteed: true };
  const settings = await AppSettings.get();
  const cap = settings.dailyBookingCap;
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const ecType = await require('../models/ServiceType').findOne({ slug: 'entrance-cleaning' }).select('_id').lean();
  const excludeFilter = ecType ? { serviceTypeId: { $ne: ecType._id } } : {};
  const booked = await Booking.countDocuments({
    scheduledDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] },
    ...excludeFilter,
  });
  return { date: dateStr, booked, cap, available: (booked + count) <= cap };
}

async function getEntranceCleaningCapacity(dateStr) {
  const settings = await AppSettings.get();
  const cap = settings.entranceCleaningDailyCap;
  if (cap === 0) return { date: dateStr, booked: 0, cap: 0, available: true, unlimited: true };
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const ecType = await require('../models/ServiceType').findOne({ slug: 'entrance-cleaning' }).select('_id').lean();
  if (!ecType) return { date: dateStr, booked: 0, cap, available: true };
  const booked = await Booking.countDocuments({
    scheduledDate: { $gte: dayStart, $lt: dayEnd },
    serviceTypeId: ecType._id,
    status: { $in: ['pending', 'active', 'en-route', 'arrived', 'completed'] },
  });
  return { date: dateStr, booked, cap, available: booked < cap };
}

async function createBatch(userId, { addresses, serviceTypeId, scheduledDate, bookingType, barrelCounts = {}, putOutTime, bringInTime, itemCount, curbItemNotes, curbItemPhotos }) {
  const { v4: uuidv4 } = require('uuid');
  const batchId = uuidv4();
  const created = [];

  for (const addressId of addresses) {
    try {
      const barrelCount = barrelCounts[addressId] || 1;
      const result = await create(userId, {
        addressId,
        serviceTypeId,
        scheduledDate,
        bookingType,
        barrelCount,
        putOutTime,
        bringInTime,
        itemCount,
        curbItemNotes,
        curbItemPhotos,
        batchId,
      });
      const list = Array.isArray(result) ? result : [result];
      created.push(...list);
    } catch (err) {
      // rollback all created bookings and rethrow
      if (created.length > 0) {
        const ids = created.map(b => b._id);
        await Booking.deleteMany({ _id: { $in: ids } });
      }
      err.message = `Batch booking failed at address ${addressId}: ${err.message}`;
      throw err;
    }
  }
  return { bookings: created, batchId };
}

module.exports = { create, createBatch, listByUser, getById, updateStatus, cancel, reschedule, chargeBookingOnCompletion, expireOverdueBookings, getCapacity, getEntranceCleaningCapacity };
