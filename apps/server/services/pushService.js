const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const NativeDevice = require('../models/NativeDevice');
const apns = require('./apnsService');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@atyors.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

async function subscribe(userId, subscription) {
  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { userId, endpoint: subscription.endpoint, keys: subscription.keys },
    { upsert: true, new: true }
  );
}

async function unsubscribe(userId, endpoint) {
  return PushSubscription.deleteOne({ userId, endpoint });
}

async function registerDevice(userId, token, platform = 'ios') {
  return NativeDevice.findOneAndUpdate(
    { token },
    { userId, token, platform },
    { upsert: true, new: true }
  );
}

async function unregisterDevice(userId, token) {
  return NativeDevice.deleteOne({ userId, token });
}

async function sendToUser(userId, { title, body, data }) {
  const promises = [];

  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    const subs = await PushSubscription.find({ userId }).lean();
    if (subs.length) {
      const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data || {},
        silent: false,
        requireInteraction: true,
        actions: [{ action: 'view', title: 'View' }],
      });

      const webResults = await Promise.allSettled(
        subs.map((sub) =>
          webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload,
            { TTL: 24 * 60 * 60, urgency: 'high' }
          )
        )
      );

      const expired = webResults
        .map((r, i) => (r.status === 'rejected' && r.reason?.statusCode === 410 ? subs[i]._id : null))
        .filter(Boolean);

      if (expired.length) {
        await PushSubscription.deleteMany({ _id: { $in: expired } });
      }
    }
  }

  if (apns.isConfigured()) {
    const devices = await NativeDevice.find({ userId }).lean();
    if (devices.length) {
      const nativeResults = await Promise.allSettled(
        devices.map((d) => apns.sendNotification(d.token, { title, body, data }))
      );

      const stale = nativeResults
        .map((r, i) => {
          if (r.status === 'rejected' && /BadDeviceToken|Unregistered/.test(r.reason?.message)) {
            return devices[i]._id;
          }
          return null;
        })
        .filter(Boolean);

      if (stale.length) {
        await NativeDevice.deleteMany({ _id: { $in: stale } });
      }
    }
  }
}

module.exports = { subscribe, unsubscribe, registerDevice, unregisterDevice, sendToUser };
