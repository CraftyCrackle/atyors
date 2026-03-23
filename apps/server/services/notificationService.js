const Notification = require('../models/Notification');
const User = require('../models/User');
const pushService = require('./pushService');

async function create({ userId, type, title, body, bookingId, meta }) {
  const uid = userId?._id || userId;
  const notification = await Notification.create({ userId: uid, type, title, body, bookingId, meta });

  const trackingTypes = ['booking:accepted', 'booking:status', 'job:available', 'booking:en-route', 'booking:arrived'];
  let pushUrl = '/notifications';
  if (bookingId) {
    if (type === 'message:new') pushUrl = `/chat/${bookingId}`;
    else if (trackingTypes.includes(type)) pushUrl = `/tracking/${bookingId}`;
    else pushUrl = `/booking/${bookingId}`;
  }

  pushService
    .sendToUser(uid, { title, body, data: { type, bookingId: bookingId?.toString(), url: pushUrl } })
    .catch(() => {});

  return notification;
}

async function notifyServicers({ title, body, bookingId, io, type, socketEvent }) {
  const notifType = type || 'job:available';
  const event = socketEvent || 'job:available';
  const servicers = await User.find({ role: { $in: ['servicer', 'admin', 'superadmin'] }, isActive: true }).select('_id').lean();

  for (const svc of servicers) {
    create({ userId: svc._id, type: notifType, title, body, bookingId }).catch((err) => {
      console.error(`[Notify] Failed to notify servicer ${svc._id}:`, err.message);
    });
  }

  if (io) {
    for (const svc of servicers) {
      io.of('/notifications').to(`user:${svc._id}`).emit(event, {
        bookingId: bookingId?.toString(),
        message: body,
      });
    }
  }
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

module.exports = { create, notifyServicers, listByUser, markRead, markAllRead, getUnreadCount };
