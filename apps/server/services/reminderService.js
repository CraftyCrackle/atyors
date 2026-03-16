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

// --- Street cleaning helpers ---

function weekOccurrence(date) {
  return Math.ceil(date.getDate() / 7);
}

function matchesWeekPattern(pattern, date) {
  const n = weekOccurrence(date);
  switch (pattern) {
    case 'every': return true;
    case '1st': return n === 1;
    case '2nd': return n === 2;
    case '3rd': return n === 3;
    case '4th': return n === 4;
    case '1st_and_3rd': return n === 1 || n === 3;
    case '2nd_and_4th': return n === 2 || n === 4;
    default: return true;
  }
}

function isInSeason(date, seasonStart, seasonEnd) {
  if (!seasonStart || !seasonEnd) return true;
  const [sm, sd] = seasonStart.split('-').map(Number);
  const [em, ed] = seasonEnd.split('-').map(Number);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const current = m * 100 + d;
  const start = sm * 100 + sd;
  const end = em * 100 + ed;
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

function formatTimeRange(startTime, endTime) {
  function fmt(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
  }
  if (startTime && endTime) return `${fmt(startTime)}–${fmt(endTime)}`;
  if (startTime) return `starting ${fmt(startTime)}`;
  return '';
}

async function sendStreetCleaningReminders() {
  const now = getEasternNow();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const users = await User.find({
    role: 'customer',
    isActive: true,
    'streetCleaningReminder.enabled': true,
  }).select('_id firstName streetCleaningReminder').lean();

  console.log(`[StreetClean] Check at ${timeStr} ET — ${users.length} user(s) with reminders enabled`);
  if (users.length === 0) return 0;

  const dueUsers = users.filter((u) => {
    const userMinutes = minutesSinceMidnight(u.streetCleaningReminder.time || '18:00');
    const diff = currentMinutes - userMinutes;
    return diff >= 0 && diff < 30;
  });

  if (dueUsers.length === 0) {
    console.log('[StreetClean] No users due in this window');
    return 0;
  }

  const userIds = dueUsers.map((u) => u._id);

  const addresses = await Address.find({
    userId: { $in: userIds },
    'streetCleaning.0': { $exists: true },
  }).select('userId street streetCleaning').lean();

  const userAddrs = {};
  for (const a of addresses) {
    const uid = a.userId.toString();
    if (!userAddrs[uid]) userAddrs[uid] = [];
    userAddrs[uid].push(a);
  }

  let sent = 0;

  for (const user of dueUsers) {
    const uid = user._id.toString();
    const addrs = userAddrs[uid];
    if (!addrs) continue;

    const userTime = minutesSinceMidnight(user.streetCleaningReminder.time || '18:00');
    const isEvening = userTime >= 720;
    const checkDate = getEasternDate(isEvening ? 1 : 0);
    const checkDayName = DAYS[checkDate.getDay()];

    for (const addr of addrs) {
      for (const sc of addr.streetCleaning) {
        if (sc.dayOfWeek !== checkDayName) continue;
        if (!matchesWeekPattern(sc.weekPattern, checkDate)) continue;
        if (!isInSeason(checkDate, sc.seasonStart, sc.seasonEnd)) continue;

        const timeRange = formatTimeRange(sc.startTime, sc.endTime);
        const sideNote = sc.side ? ` (${sc.side})` : '';
        const streetName = addr.street || 'your street';

        let title, body;
        if (isEvening) {
          title = '🚗 Street cleaning tomorrow!';
          body = `Hey ${user.firstName}, street cleaning on ${streetName}${sideNote} is tomorrow${timeRange ? ` ${timeRange}` : ''}. Move your car tonight!`;
        } else {
          title = '🚗 Street cleaning today!';
          body = `Good morning ${user.firstName}! Street cleaning on ${streetName}${sideNote} is today${timeRange ? ` ${timeRange}` : ''}. Make sure your car is moved!`;
        }

        try {
          await notificationService.create({ userId: user._id, type: 'street:reminder', title, body });
          sent++;
          console.log(`[StreetClean] Sent to ${user.firstName} (${uid}) for ${streetName} ${checkDayName}${sideNote}`);
        } catch (err) {
          console.error(`[StreetClean] Failed for user ${uid}:`, err.message);
        }
      }
    }
  }

  console.log(`[StreetClean] Done — sent ${sent} reminder(s)`);
  return sent;
}

module.exports = {
  sendTrashDayReminders,
  sendStreetCleaningReminders,
  getHolidaysForYear,
  getHolidayOn,
  isHoliday,
  getEffectivePickupDate,
  observedDate,
  buildHolidayMap,
  weekOccurrence,
  matchesWeekPattern,
  isInSeason,
  formatTimeRange,
};
