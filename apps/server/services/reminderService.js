const User = require('../models/User');
const Address = require('../models/Address');
const pushService = require('./pushService');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getEasternNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
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

  const users = await User.find({
    role: 'customer',
    isActive: true,
    'trashDayReminder.enabled': true,
  }).select('_id firstName trashDayReminder addresses').lean();

  if (users.length === 0) return 0;

  const dueUsers = users.filter((u) => {
    const userMinutes = minutesSinceMidnight(u.trashDayReminder.time || '18:00');
    const diff = currentMinutes - userMinutes;
    return diff >= 0 && diff < 30;
  });

  if (dueUsers.length === 0) return 0;

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
    if (!days) continue;

    const userTime = minutesSinceMidnight(user.trashDayReminder.time || '18:00');
    const isEvening = userTime >= 720;
    const targetDay = isEvening ? tomorrowDay : todayDay;

    if (!days.has(targetDay)) continue;

    const title = isEvening ? '🗑️ Trash day tomorrow!' : '🗑️ Trash day today!';
    const body = isEvening
      ? `Hey ${user.firstName}, tomorrow is ${targetDay} — don't forget to put your barrels out!`
      : `Good morning ${user.firstName}! Today is ${targetDay} — time to get those barrels to the curb!`;

    try {
      await pushService.sendToUser(user._id, {
        title,
        body,
        data: { type: 'trash:reminder', url: '/dashboard' },
      });
      sent++;
    } catch (err) {
      console.error(`[Reminder] Failed to send to user ${user._id}:`, err.message);
    }
  }

  if (sent > 0) console.log(`[Reminder] Sent ${sent} trash day reminder(s)`);
  return sent;
}

module.exports = { sendTrashDayReminders };
