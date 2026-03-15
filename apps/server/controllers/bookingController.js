const bookingService = require('../services/bookingService');
const stripeService = require('../services/stripeService');
const notificationService = require('../services/notificationService');
const config = require('../config');
const Booking = require('../models/Booking');

const GRACE_PERIOD_MS = 2 * 60 * 1000;

async function create(req, res, next) {
  try {
    const isSubscription = !!req.body.subscriptionId;
    if (!isSubscription && !config.stripe.skip) {
      const hasCard = await stripeService.hasDefaultPaymentMethod(req.user);
      if (!hasCard) {
        const err = new Error('Please add a payment method in your Profile before booking.');
        err.status = 400;
        err.code = 'NO_PAYMENT_METHOD';
        return next(err);
      }
    }

    const result = await bookingService.create(req.user._id, req.body);

    const io = req.app.locals.io;
    const primary = Array.isArray(result) ? result[0] : result;
    const bookingId = primary._id;

    setTimeout(async () => {
      try {
        const fresh = await Booking.findById(bookingId).lean();
        if (!fresh || fresh.status === 'cancelled') return;
        await notificationService.notifyServicers({
          title: 'New job available',
          body: 'A new job is available for pickup.',
          bookingId,
          io,
        });
      } catch (err) {
        console.error('[Notify] delayed notifyServicers error:', err.message);
      }
    }, GRACE_PERIOD_MS);

    if (Array.isArray(result)) {
      return res.status(201).json({ success: true, data: { bookings: result } });
    }
    res.status(201).json({ success: true, data: { booking: result } });
  } catch (err) { next(err); }
}

async function confirmPayment(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }

    if (booking.paymentStatus === 'paid') {
      return res.json({ success: true, data: { booking, alreadyPaid: true } });
    }

    if (booking.paymentStatus !== 'charge_failed') {
      const err = new Error('No payment action needed for this booking');
      err.status = 400;
      throw err;
    }

    if (config.stripe.skip) {
      booking.paymentStatus = 'paid';
      await booking.save();
      return res.json({ success: true, data: { booking } });
    }

    const stripe = require('stripe')(config.stripe.secretKey);

    if (booking.stripePaymentIntentId) {
      const existingPi = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
      if (existingPi.status === 'requires_action') {
        return res.json({ success: true, data: { clientSecret: existingPi.client_secret, paymentIntentId: existingPi.id } });
      }
      if (existingPi.status === 'succeeded') {
        booking.paymentStatus = 'paid';
        await booking.save();
        return res.json({ success: true, data: { booking, alreadyPaid: true } });
      }
      if (['requires_payment_method', 'requires_confirmation'].includes(existingPi.status)) {
        await stripe.paymentIntents.cancel(existingPi.id).catch(() => {});
      }
    }

    const intent = await stripeService.createPaymentIntent(req.user, booking.amount, booking._id.toString());
    booking.stripePaymentIntentId = intent.id;
    await booking.save();

    res.json({ success: true, data: { clientSecret: intent.client_secret, paymentIntentId: intent.id } });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { status, page, limit, sortBy } = req.query;
    const result = await bookingService.listByUser(req.user._id, { status, page: parseInt(page) || 1, limit: parseInt(limit) || 20, sortBy });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const booking = await bookingService.getById(req.params.id, req.user._id);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const booking = await bookingService.cancel(req.params.id, req.user._id, req.body.reason);
    await booking.populate('serviceTypeId');

    const io = req.app.locals.io;
    const svcName = booking.serviceTypeId?.name || 'Service';
    const customerName = `${req.user.firstName} ${req.user.lastName}`;
    const msg = `${customerName} cancelled their ${svcName} booking.`;

    if (booking.assignedTo) {
      const servicerId = booking.assignedTo?._id || booking.assignedTo;
      notificationService.create({
        userId: servicerId,
        type: 'booking:status',
        title: 'Booking Cancelled',
        body: msg,
        bookingId: booking._id,
        meta: { status: 'cancelled' },
      }).catch((err) => console.error('[Notify] cancel notify error:', err.message));

      if (io) {
        io.of('/notifications').to(`user:${servicerId}`).emit('booking:status', {
          bookingId: booking._id, status: 'cancelled', message: msg,
        });
      }
    } else {
      notificationService.notifyServicers({
        title: 'Booking Cancelled',
        body: msg,
        bookingId: booking._id,
        io,
        type: 'booking:status',
        socketEvent: 'booking:status',
      }).catch((err) => console.error('[Notify] cancel notifyServicers error:', err.message));
    }

    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function reschedule(req, res, next) {
  try {
    const booking = await bookingService.reschedule(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: { booking } });
  } catch (err) { next(err); }
}

async function getQueuePosition(req, res, next) {
  try {
    const routeService = require('../services/routeService');
    const queue = await routeService.getQueuePosition(req.params.id);
    res.json({ success: true, data: { queue } });
  } catch (err) { next(err); }
}

async function uploadCurbItemPhotos(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      const err = new Error('No photos uploaded');
      err.status = 400;
      throw err;
    }
    const urls = req.files.map((f) => `/uploads/${f.filename}`);
    res.json({ success: true, data: { photos: urls } });
  } catch (err) { next(err); }
}

async function checkCapacity(req, res, next) {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'date query param required (YYYY-MM-DD)' } });
    }
    const data = await bookingService.getCapacity(date);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { create, confirmPayment, list, getById, cancel, reschedule, getQueuePosition, uploadCurbItemPhotos, checkCapacity };
