/**
 * When a reminder fires. No Node builtins: the phone imports this file.
 *
 * A dated save has no clock time, so its reminders are 09:00 in the place's
 * time zone, 7, 3, and 1 calendar days before the date. A plan time such as
 * "6:45 pm" uses that time of day instead. Calendar days are subtracted in
 * the civil date, so a daylight saving shift does not move the local hour.
 */

export const REMINDER_LOCAL_HOUR = 9;
export const REMINDER_OFFSETS_DAYS = [7, 3, 1];
/** How long after the clock time a reminder may still go out. Later than this, it is skipped. */
export const REMINDER_ON_TIME_MS = 60 * 1000;
/** How often to look again for a plan that was added after the timer went to sleep. */
export const REMINDER_RECHECK_MS = 60 * 1000;

/** `YYYY-MM-DD` plus a whole number of calendar days, via UTC so the host zone cannot shift it. */
export function addCalendarDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}

/** Milliseconds to add to a UTC instant to get the wall clock in `timeZone`. */
function zoneOffsetMs(utcDate, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map = {};
  for (const part of dtf.formatToParts(utcDate)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const asIfUtc = Date.UTC(+map.year, +map.month - 1, +map.day, hour, +map.minute, +map.second);
  return asIfUtc - utcDate.getTime();
}

/**
 * A plan time such as "7 pm" or "6:45 pm", as 24-hour clock parts.
 * Anything else, including a missing time, is null and the caller uses 09:00.
 * @param {string | null | undefined} text
 * @returns {{ hour: number, minute: number } | null}
 */
export function parseEventClock(text) {
  if (typeof text !== 'string') return null;
  const match = text.trim().toLowerCase().match(/^([0-9]{1,2})(?::([0-9]{2}))? (am|pm)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (match[3] === 'am') hour = hour === 12 ? 0 : hour;
  else if (hour !== 12) hour += 12;
  return { hour, minute };
}

function clockParts(clock) {
  if (!clock || !Number.isInteger(clock.hour) || !Number.isInteger(clock.minute)) {
    return { hour: REMINDER_LOCAL_HOUR, minute: 0 };
  }
  return clock;
}

/** The UTC instant of `hour`:`minute` on `isoDate` in `timeZone`. */
export function zonedLocalToUtc(isoDate, hour, timeZone, minute = 0) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const localAsUtc = Date.UTC(y, m - 1, d, hour, minute, 0);
  const first = localAsUtc - zoneOffsetMs(new Date(localAsUtc), timeZone);
  return new Date(localAsUtc - zoneOffsetMs(new Date(first), timeZone));
}

/**
 * @param {string} eventDate
 * @param {string} timeZone
 * @param {{ hour: number, minute: number } | null} [clock]
 */
export function eventStartInstant(eventDate, timeZone, clock) {
  const { hour, minute } = clockParts(clock);
  return zonedLocalToUtc(eventDate, hour, timeZone, minute);
}

/**
 * @param {string} eventDate
 * @param {number} offsetDays
 * @param {string} timeZone
 * @param {{ hour: number, minute: number } | null} [clock]
 */
export function fireInstant(eventDate, offsetDays, timeZone, clock) {
  const { hour, minute } = clockParts(clock);
  return zonedLocalToUtc(addCalendarDays(eventDate, -offsetDays), hour, timeZone, minute);
}

function validClock(eventDate, timeZone, now, clock) {
  if (!eventDate || !timeZone || !(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  let start;
  try {
    start = eventStartInstant(eventDate, timeZone, clock);
  } catch {
    return null;
  }
  if (now >= start) return null;
  return start;
}

/**
 * Offsets whose clock time is this minute, and whose event has not started.
 * A reminder from an earlier minute is not due: opening the app, or a late
 * check, does not send the ones that were already missed. With no clock,
 * that minute is 09:00. Empty for an unknown zone, a bad date, or a past event.
 * @param {string} eventDate
 * @param {string} timeZone
 * @param {Date} now
 * @param {{ hour: number, minute: number } | null} [clock]
 */
export function dueOffsets(eventDate, timeZone, now, clock) {
  if (!validClock(eventDate, timeZone, now, clock)) return [];
  return REMINDER_OFFSETS_DAYS.filter(offset => {
    const lateBy = now.getTime() - fireInstant(eventDate, offset, timeZone, clock).getTime();
    return lateBy >= 0 && lateBy < REMINDER_ON_TIME_MS;
  });
}

/**
 * Offsets whose clock time is still ahead of `now`. The phone schedules
 * these for that instant and does not fire anything that has already passed.
 * @param {string} eventDate
 * @param {string} timeZone
 * @param {Date} now
 * @param {{ hour: number, minute: number } | null} [clock]
 */
export function futureOffsets(eventDate, timeZone, now, clock) {
  if (!validClock(eventDate, timeZone, now, clock)) return [];
  return REMINDER_OFFSETS_DAYS.filter(offset => fireInstant(eventDate, offset, timeZone, clock) > now);
}

/**
 * Milliseconds until the next reminder. `0` means send now. A time that is
 * still far off waits at most `recheckMs`, so a plan added in the meantime
 * can move the wake earlier. No upcoming reminder waits `recheckMs`.
 * @param {Date | null | undefined} nextAt
 * @param {Date} now
 * @param {number} [recheckMs]
 */
export function nextWakeMs(nextAt, now, recheckMs = REMINDER_RECHECK_MS) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return recheckMs;
  if (!(nextAt instanceof Date) || Number.isNaN(nextAt.getTime())) return recheckMs;
  const wait = nextAt.getTime() - now.getTime();
  if (wait <= 1_000) return 0;
  return Math.min(wait, recheckMs);
}
