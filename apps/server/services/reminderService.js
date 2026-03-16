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

function getEasternDate(offset = 0) {
  const d = getEasternNow();
  d.setDate(d.getDate() + offset);
  return d;
}

function getEasternDay(offset = 0) {
  return DAYS[getEasternDate(offset).getDay()];
}

function minutesSinceMidnight(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// --- Holiday detection (US federal holidays that affect trash collection) ---

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  let day = 1 + ((weekday - first.getDay() + 7) % 7);
  day += (n - 1) * 7;
  return new Date(year, month, day);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - diff);
}

function getHolidaysForYear(year) {
  return [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: nthWeekdayOfMonth(year, 0, 1, 3), name: 'Martin Luther King Jr. Day' },
    { date: nthWeekdayOfMonth(year, 1, 1, 3), name: "Presidents' Day" },
    { date: lastWeekdayOfMonth(year, 4, 1), name: 'Memorial Day' },
    { date: new Date(year, 5, 19), name: 'Juneteenth' },
    { date: new Date(year, 6, 4), name: 'Independence Day' },
    { date: nthWeekdayOfMonth(year, 8, 1, 1), name: 'Labor Day' },
    { date: nthWeekdayOfMonth(year, 9, 1, 2), name: 'Columbus Day' },
    { date: new Date(year, 10, 11), name: 'Veterans Day' },
    { date: nthWeekdayOfMonth(year, 10, 4, 4), name: 'Thanksgiving' },
    { date: new Date(year, 11, 25), name: 'Christmas Day' },
  ];
}

function observedDate(holiday) {
  const d = new Date(holiday.getTime());
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  if (dow === 6) d.setDate(d.getDate() - 1);
  return d;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildHolidayMap(year) {
  const map = {};
  for (const h of getHolidaysForYear(year)) {
    const obs = observedDate(h.date);
    map[dateKey(obs)] = h.name;
  }
  return map;
}

function getHolidayOn(date) {
  const year = date.getFullYear();
  const map = buildHolidayMap(year);
  return map[dateKey(date)] || null;
}

function isHoliday(date) {
  return !!getHolidayOn(date);
}

/**
 * Determines the effective pickup date given the scheduled day.
 * If a holiday falls on or before the scheduled day within the same week,
 * all remaining pickups shift forward by one day.
 *
 * Most US waste haulers use this rule: if a holiday falls Mon–Fri,
 * that day and every day after it in the week slide forward by one day.
 */
function getEffectivePickupDate(scheduledDate) {
  const dow = scheduledDate.getDay();
  if (dow === 0 || dow === 6) return { date: scheduledDate, holiday: null };

  const monday = new Date(scheduledDate.getTime());
  monday.setDate(monday.getDate() - (dow - 1));

  for (let i = 0; i < dow; i++) {
    const check = new Date(monday.getTime());
    check.setDate(check.getDate() + i);
    const holidayName = getHolidayOn(check);
    if (holidayName) {
      const shifted = new Date(scheduledDate.getTime());
      shifted.setDate(shifted.getDate() + 1);
      return { date: shifted, holiday: holidayName };
    }
  }

  return { date: scheduledDate, holiday: null };
}

// --- Reminder sending ---

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

  const addresses = await Address.find({
    userId: { $in: userIds },
    trashDay: { $exists: true, $ne: '' },
  }).select('userId trashDay').lean();

  const userAddresses = {};
  for (const a of addresses) {
    const uid = a.userId.toString();
    if (!userAddresses[uid]) userAddresses[uid] = [];
    userAddresses[uid].push(a.trashDay);
  }

  let sent = 0;

  for (const user of dueUsers) {
    const uid = user._id.toString();
    const trashDays = userAddresses[uid];
    if (!trashDays || trashDays.length === 0) continue;

    const userTime = minutesSinceMidnight(user.trashDayReminder.time || '18:00');
    const isEvening = userTime >= 720;
    const checkDate = getEasternDate(isEvening ? 1 : 0);
    const checkDayName = DAYS[checkDate.getDay()];

    if (!trashDays.includes(checkDayName)) continue;

    const { date: effectiveDate, holiday } = getEffectivePickupDate(checkDate);
    const effectiveDayName = DAYS[effectiveDate.getDay()];
    const shifted = holiday !== null;

    let title, body;

    if (shifted) {
      title = '🗑️ Trash day moved!';
      if (isEvening) {
        body = `Hey ${user.firstName}, ${checkDayName}'s pickup is pushed to ${effectiveDayName} due to ${holiday}. Put your barrels out ${effectiveDayName} morning!`;
      } else {
        body = `Good morning ${user.firstName}! Today's pickup is pushed to ${effectiveDayName} due to ${holiday}. Hold off on the barrels until tomorrow!`;
      }
    } else {
      title = isEvening ? '🗑️ Trash day tomorrow!' : '🗑️ Trash day today!';
      body = isEvening
        ? `Hey ${user.firstName}, tomorrow is ${checkDayName} — don't forget to put your barrels out!`
        : `Good morning ${user.firstName}! Today is ${checkDayName} — time to get those barrels to the curb!`;
    }

    try {
      await notificationService.create({
        userId: user._id,
        type: 'trash:reminder',
        title,
        body,
      });
      sent++;
      console.log(`[Reminder] Sent to ${user.firstName} (${uid}) for ${checkDayName}${shifted ? ` → shifted to ${effectiveDayName} (${holiday})` : ''}`);
    } catch (err) {
      console.error(`[Reminder] Failed to send to user ${uid}:`, err.message);
    }
  }

  console.log(`[Reminder] Done — sent ${sent} reminder(s)`);
  return sent;
}

module.exports = {
  sendTrashDayReminders,
  getHolidaysForYear,
  getHolidayOn,
  isHoliday,
  getEffectivePickupDate,
  observedDate,
  buildHolidayMap,
};
