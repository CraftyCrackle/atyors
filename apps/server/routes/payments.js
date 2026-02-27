const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const stripeService = require('../services/stripeService');

const MOCK_METHODS = [
  { id: 'pm_mock_visa', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2028, isDefault: true },
  { id: 'pm_mock_mc', brand: 'mastercard', last4: '8210', expMonth: 6, expYear: 2027, isDefault: false },
];

router.post('/create-intent', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { clientSecret: 'dev_mock_secret', paymentIntentId: 'pi_dev_mock' } });
    }
    const intent = await stripeService.createPaymentIntent(req.user, req.body.amount, req.body.bookingId);
    res.json({ success: true, data: { clientSecret: intent.client_secret, paymentIntentId: intent.id } });
  } catch (err) { next(err); }
});

router.post('/setup-intent', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { clientSecret: 'dev_mock_setup_secret' } });
    }
    const intent = await stripeService.createSetupIntent(req.user);
    res.json({ success: true, data: { clientSecret: intent.client_secret } });
  } catch (err) { next(err); }
});

router.get('/methods', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { methods: MOCK_METHODS } });
    }
    const methods = await stripeService.listPaymentMethods(req.user);
    res.json({ success: true, data: { methods } });
  } catch (err) { next(err); }
});

router.delete('/methods/:id', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { message: 'Payment method removed' } });
    }
    await stripeService.removePaymentMethod(req.user, req.params.id);
    res.json({ success: true, data: { message: 'Payment method removed' } });
  } catch (err) { next(err); }
});

router.patch('/methods/:id/default', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { message: 'Default payment method updated' } });
    }
    await stripeService.setDefaultPaymentMethod(req.user, req.params.id);
    res.json({ success: true, data: { message: 'Default payment method updated' } });
  } catch (err) { next(err); }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    if (config.stripe.skip) {
      return res.json({ success: true, data: { charges: [] } });
    }
    const stripe = require('stripe')(config.stripe.secretKey);
    const customerId = await stripeService.ensureCustomer(req.user);
    const charges = await stripe.charges.list({ customer: customerId, limit: 20 });
    res.json({ success: true, data: { charges: charges.data } });
  } catch (err) { next(err); }
});

module.exports = router;
