const Notification = require('../models/Notification');
const pushService = require('./pushService');

async function create({ userId, type, title, body, bookingId, meta }) {
  const notification = await Notification.create({ userId, type, title, body, bookingId, meta });

  pushService
    .sendToUser(userId, { title, body, data: { type, bookingId: bookingId?.toString(), url: bookingId ? `/booking/${bookingId}` : '/notifications' } })
    .catch(() => {});

  return notification;
}

async function listByUser(userId, { page = 1, limit = 30 } = {}) {
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const unreadCount = await Notification.countDocuments({ userId, readAt: null });
  return { notifications, unreadCount };
}

async function markRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { readAt: new Date() },
    { new: true }
  );
}

async function markAllRead(userId) {
  await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, readAt: null });
}

module.exports = { create, listByUser, markRead, markAllRead, getUnreadCount };
