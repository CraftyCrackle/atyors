const User = require('../models/User');
const Address = require('../models/Address');
const notificationService = require('./notificationService');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ET_OFFSET_EST = -5;
const ET_OFFSET_EDT = -4;

function getEasternNow() {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = now.getTimezoneOffset() < stdOffset;

  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const etOffset = isDST ? ET_OFFSET_EDT : ET_OFFSET_EST;
  return new Date(utcMs + etOffset * 3600000);
}

function getEasternDay(offset = 0) {
  const d = getEasternNow();
  d.setDate(d.getDate() + offset);
  return DAYS[d.getDay()];
}

function minutesSinceMidnight(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

async function sendTrashDayReminders() {
  const now = getEasternNow();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const users = await User.find({
    role: 'customer',
    isActive: true,
    'trashDayReminder.enabled': true,
  }).select('_id firstName trashDayReminder addresses').lean();

  console.log(`[Reminder] Check at ${timeStr} ET — ${users.length} user(s) with reminders enabled`);

  if (users.length === 0) return 0;

  const dueUsers = users.filter((u) => {
    const userMinutes = minutesSinceMidnight(u.trashDayReminder.time || '18:00');
    const diff = currentMinutes - userMinutes;
    return diff >= 0 && diff < 30;
  });

  if (dueUsers.length === 0) {
    console.log('[Reminder] No users due for reminders in this window');
    return 0;
  }

  console.log(`[Reminder] ${dueUsers.length} user(s) due for reminders`);

  const userIds = dueUsers.map((u) => u._id);

  const eveningUsers = dueUsers.filter((u) => minutesSinceMidnight(u.trashDayReminder.time || '18:00') >= 720);
  const morningUsers = dueUsers.filter((u) => minutesSinceMidnight(u.trashDayReminder.time || '18:00') < 720);

  const tomorrowDay = getEasternDay(1);
  const todayDay = getEasternDay(0);

  const allDays = new Set();
  if (eveningUsers.length > 0) allDays.add(tomorrowDay);
  if (morningUsers.length > 0) allDays.add(todayDay);

  const addresses = await Address.find({
    userId: { $in: userIds },
    trashDay: { $in: [...allDays] },
  }).select('userId trashDay').lean();

  const userTrashDays = {};
  for (const a of addresses) {
    const uid = a.userId.toString();
    if (!userTrashDays[uid]) userTrashDays[uid] = new Set();
    userTrashDays[uid].add(a.trashDay);
  }

  let sent = 0;

  for (const user of dueUsers) {
    const uid = user._id.toString();
    const days = userTrashDays[uid];
    if (!days) {
      console.log(`[Reminder] User ${uid} (${user.firstName}) — no matching trash day address`);
      continue;
    }

    const userTime = minutesSinceMidnight(user.trashDayReminder.time || '18:00');
    const isEvening = userTime >= 720;
    const targetDay = isEvening ? tomorrowDay : todayDay;

    if (!days.has(targetDay)) {
      console.log(`[Reminder] User ${uid} (${user.firstName}) — trash day doesn't match ${targetDay}`);
      continue;
    }

    const title = isEvening ? '🗑️ Trash day tomorrow!' : '🗑️ Trash day today!';
    const body = isEvening
      ? `Hey ${user.firstName}, tomorrow is ${targetDay} — don't forget to put your barrels out!`
      : `Good morning ${user.firstName}! Today is ${targetDay} — time to get those barrels to the curb!`;

    try {
      await notificationService.create({
        userId: user._id,
        type: 'trash:reminder',
        title,
        body,
      });
      sent++;
      console.log(`[Reminder] Sent to ${user.firstName} (${uid}) for ${targetDay}`);
    } catch (err) {
      console.error(`[Reminder] Failed to send to user ${uid}:`, err.message);
    }
  }

  console.log(`[Reminder] Done — sent ${sent} reminder(s)`);
  return sent;
}

module.exports = { sendTrashDayReminders };
