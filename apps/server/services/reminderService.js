const User = require('../models/User');
const Address = require('../models/Address');
const pushService = require('./pushService');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getEasternDay(offset = 0) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  d.setDate(d.getDate() + offset);
  return DAYS[d.getDay()];
}

function getEasternHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
}

async function sendTrashDayReminders() {
  const hour = getEasternHour();

  let targetDay;
  let timing;

  if (hour >= 18 && hour <= 21) {
    targetDay = getEasternDay(1);
    timing = 'evening-before';
  } else if (hour >= 5 && hour <= 8) {
    targetDay = getEasternDay(0);
    timing = 'morning-of';
  } else {
    return 0;
  }

  const users = await User.find({
    role: 'customer',
    isActive: true,
    'trashDayReminder.enabled': true,
    'trashDayReminder.timing': { $in: [timing, 'both'] },
  }).select('_id firstName addresses').lean();

  if (users.length === 0) return 0;

  const userIds = users.map((u) => u._id);
  const addresses = await Address.find({
    userId: { $in: userIds },
    trashDay: targetDay,
  }).select('userId trashDay').lean();

  const usersWithTrashDay = new Set(addresses.map((a) => a.userId.toString()));
  let sent = 0;

  for (const user of users) {
    if (!usersWithTrashDay.has(user._id.toString())) continue;

    const title = timing === 'evening-before'
      ? '🗑️ Trash day tomorrow!'
      : '🗑️ Trash day today!';
    const body = timing === 'evening-before'
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

  if (sent > 0) console.log(`[Reminder] Sent ${sent} trash day reminder(s) for ${targetDay} (${timing})`);
  return sent;
}

module.exports = { sendTrashDayReminders };
