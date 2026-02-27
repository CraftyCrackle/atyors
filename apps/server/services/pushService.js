const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

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

async function sendToUser(userId, { title, body, data }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subs = await PushSubscription.find({ userId }).lean();
  if (!subs.length) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data || {},
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
        { TTL: 60 * 60 }
      )
    )
  );

  const expired = results
    .map((r, i) => (r.status === 'rejected' && r.reason?.statusCode === 410 ? subs[i]._id : null))
    .filter(Boolean);

  if (expired.length) {
    await PushSubscription.deleteMany({ _id: { $in: expired } });
  }
}

module.exports = { subscribe, unsubscribe, sendToUser };
