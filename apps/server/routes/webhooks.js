const router = require('express').Router();
const express = require('express');
const config = require('../config');
const Booking = require('../models/Booking');
const Subscription = require('../models/Subscription');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (config.stripe.skip) return res.json({ received: true });

  const stripe = require('stripe')(config.stripe.secretKey);
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const { bookingId } = event.data.object.metadata;
      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          status: 'confirmed',
          stripePaymentIntentId: event.data.object.id,
          $push: { statusHistory: { status: 'confirmed', changedAt: new Date() } },
        });
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const { bookingId } = event.data.object.metadata;
      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Payment failed' });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = await Subscription.findOne({ stripeSubscriptionId: event.data.object.id });
      if (sub) {
        sub.status = event.data.object.status === 'active' ? 'active' : 'past_due';
        sub.currentPeriodStart = new Date(event.data.object.current_period_start * 1000);
        sub.currentPeriodEnd = new Date(event.data.object.current_period_end * 1000);
        await sub.save();
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = await Subscription.findOne({ stripeSubscriptionId: event.data.object.id });
      if (sub) {
        sub.status = 'cancelled';
        sub.cancelledAt = new Date();
        await sub.save();
        await Booking.updateMany(
          { subscriptionId: sub._id, status: { $in: ['pending', 'confirmed'] }, scheduledDate: { $gte: new Date() } },
          { status: 'cancelled', cancelledAt: new Date() }
        );
      }
      break;
    }
    case 'invoice.payment_failed': {
      const sub = await Subscription.findOne({ stripeSubscriptionId: event.data.object.subscription });
      if (sub) {
        sub.status = 'past_due';
        await sub.save();
      }
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
