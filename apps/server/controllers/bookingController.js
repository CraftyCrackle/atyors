const bookingService = require('../services/bookingService');
const stripeService = require('../services/stripeService');
const config = require('../config');
const Booking = require('../models/Booking');

async function create(req, res, next) {
  try {
    const result = await bookingService.create(req.user._id, req.body);
    const bookings = Array.isArray(result) ? result : [result];
    const totalAmount = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    let clientSecret = null;

    if (totalAmount > 0) {
      if (config.stripe.skip) {
        clientSecret = 'dev_mock_secret';
        for (const b of bookings) {
          b.paymentStatus = 'paid';
          await b.save();
        }
      } else {
        const primaryBooking = bookings[0];
        const intent = await stripeService.createPaymentIntent(req.user, totalAmount, primaryBooking._id.toString());
        clientSecret = intent.client_secret;
        for (const b of bookings) {
          b.stripePaymentIntentId = intent.id;
          await b.save();
        }
      }
    }

    if (Array.isArray(result)) {
      return res.status(201).json({ success: true, data: { bookings: result, clientSecret } });
    }
    res.status(201).json({ success: true, data: { booking: result, clientSecret } });
  } catch (err) { next(err); }
}

async function confirmPayment(req, res, next) {
  try {
    const { paymentIntentId } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }

    if (booking.paymentStatus === 'paid') {
      return res.json({ success: true, data: { booking } });
    }

    if (config.stripe.skip) {
      booking.paymentStatus = 'paid';
      await booking.save();
      if (booking.linkedBookingId) {
        await Booking.findByIdAndUpdate(booking.linkedBookingId, { paymentStatus: 'paid' });
      }
      return res.json({ success: true, data: { booking } });
    }

    if (!paymentIntentId || booking.stripePaymentIntentId !== paymentIntentId) {
      const err = new Error('Payment intent does not match this booking');
      err.status = 400;
      err.code = 'PAYMENT_MISMATCH';
      throw err;
    }

    const stripe = require('stripe')(config.stripe.secretKey);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.metadata?.userId !== req.user._id.toString()) {
      const err = new Error('Payment intent does not belong to you');
      err.status = 403;
      err.code = 'PAYMENT_FORBIDDEN';
      throw err;
    }

    if (intent.status === 'succeeded') {
      booking.paymentStatus = 'paid';
      await booking.save();
      if (booking.linkedBookingId) {
        await Booking.findByIdAndUpdate(booking.linkedBookingId, { paymentStatus: 'paid' });
      }
      return res.json({ success: true, data: { booking } });
    }

    const err = new Error('Payment not completed');
    err.status = 400;
    err.code = 'PAYMENT_INCOMPLETE';
    throw err;
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

module.exports = { create, confirmPayment, list, getById, cancel, reschedule, getQueuePosition };
