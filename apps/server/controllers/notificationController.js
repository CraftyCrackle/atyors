const notificationService = require('../services/notificationService');

async function list(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await notificationService.listByUser(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 30,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }
    res.json({ success: true, data: { notification } });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user._id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
}

module.exports = { list, markRead, markAllRead, unreadCount };
