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
  console.log(`[Push] Registering device for user ${userId} (platform: ${platform}, token: ${token.substring(0, 16)}...)`);
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
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    const subs = await PushSubscription.find({ userId }).lean();
    if (subs.length) {
      console.log(`[Push] Sending web push to ${subs.length} subscription(s) for user ${userId}`);
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
      console.log(`[Push] Sending APNs to ${devices.length} device(s) for user ${userId}`);
      const nativeResults = await Promise.allSettled(
        devices.map((d) => apns.sendNotification(d.token, { title, body, data }))
      );

      nativeResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          console.log(`[Push] APNs sent OK to device ${devices[i].token.substring(0, 16)}...`);
        } else {
          console.error(`[Push] APNs failed for device ${devices[i].token.substring(0, 16)}...: ${r.reason?.message}`);
        }
      });

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
    } else {
      console.log(`[Push] No native devices registered for user ${userId}`);
    }
  } else {
    console.log('[Push] APNs not configured, skipping native push');
  }
}

module.exports = { subscribe, unsubscribe, registerDevice, unregisterDevice, sendToUser };
