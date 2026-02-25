const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: { subscription } });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const subscriptions = await subscriptionService.getByUser(req.user._id);
    res.json({ success: true, data: { subscriptions } });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.cancel(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: { subscription } });
  } catch (err) { next(err); }
});

module.exports = router;
