const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const config = require('../config');

router.post('/create-intent', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { clientSecret: 'dev_mock_secret', paymentIntentId: 'pi_dev_mock' } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(req.body.amount * 100),
      currency: 'usd',
      customer: req.user.stripeCustomerId,
      metadata: { bookingId: req.body.bookingId, userId: req.user._id.toString() },
    });
    res.json({ success: true, data: { clientSecret: intent.client_secret, paymentIntentId: intent.id } });
  } catch (err) { next(err); }
});

router.post('/setup-intent', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { clientSecret: 'dev_mock_setup_secret' } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    const intent = await stripe.setupIntents.create({ customer: req.user.stripeCustomerId });
    res.json({ success: true, data: { clientSecret: intent.client_secret } });
  } catch (err) { next(err); }
});

router.get('/methods', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { methods: [] } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    const methods = await stripe.paymentMethods.list({ customer: req.user.stripeCustomerId, type: 'card' });
    res.json({ success: true, data: { methods: methods.data } });
  } catch (err) { next(err); }
});

router.delete('/methods/:id', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { message: 'Payment method removed' } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    await stripe.paymentMethods.detach(req.params.id);
    res.json({ success: true, data: { message: 'Payment method removed' } });
  } catch (err) { next(err); }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { charges: [] } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    const charges = await stripe.charges.list({ customer: req.user.stripeCustomerId, limit: 20 });
    res.json({ success: true, data: { charges: charges.data } });
  } catch (err) { next(err); }
});

module.exports = router;
