const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const pushController = require('../controllers/pushController');
const { authenticate } = require('../middleware/auth');

const pushLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } } });

router.get('/vapid-key', pushLimiter, pushController.vapidPublicKey);
router.post('/subscribe', authenticate, pushLimiter, pushController.subscribe);
router.post('/unsubscribe', authenticate, pushController.unsubscribe);

module.exports = router;
