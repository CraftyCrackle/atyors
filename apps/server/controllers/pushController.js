const pushService = require('../services/pushService');

exports.subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }
    await pushService.subscribe(req.user._id, subscription);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
    await pushService.unsubscribe(req.user._id, endpoint);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.registerDevice = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Device token required' });
    await pushService.registerDevice(req.user._id, token, platform || 'ios');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.unregisterDevice = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Device token required' });
    await pushService.unregisterDevice(req.user._id, token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.vapidPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};
