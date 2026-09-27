/**
 * When a reminder fires.
 *
 * Dated events store a calendar date (`when_start`) and an IANA time zone on
 * the place. They do not store a clock time. The event start instant is
 * 09:00 on that date, in that zone, and the three reminders are 09:00 on the
 * calendar days 7, 3, and 1 days before it.
 *
 * 09:00 is the one delivery time. It is the same hour in the migration
 * (`time '09:00'`) — change both together. Calendar days are subtracted in
 * the civil date, not by adding hours to a UTC timestamp, so a daylight
 * saving shift does not move the local hour. 09:00 is outside the usual
 * 01:00–03:00 transition window, so the local time exists exactly once.
 */

import { find as findTimeZone } from 'geo-tz';

export const REMINDER_LOCAL_HOUR = 9;
export const REMINDER_OFFSETS_DAYS = [7, 3, 1];

const IANA = /^(?:UTC|[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)+)$/;

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

/** The UTC instant of `hour`:00 on `isoDate` in `timeZone`. */
export function zonedLocalToUtc(isoDate, hour, timeZone) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const localAsUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
  const first = localAsUtc - zoneOffsetMs(new Date(localAsUtc), timeZone);
  return new Date(localAsUtc - zoneOffsetMs(new Date(first), timeZone));
}

export function eventStartInstant(eventDate, timeZone) {
  return zonedLocalToUtc(eventDate, REMINDER_LOCAL_HOUR, timeZone);
}

export function fireInstant(eventDate, offsetDays, timeZone) {
  return zonedLocalToUtc(addCalendarDays(eventDate, -offsetDays), REMINDER_LOCAL_HOUR, timeZone);
}

/**
 * Offsets whose 09:00 local instant has arrived and whose event has not
 * started. Empty for an unknown zone, a bad date, or a past event.
 */
export function dueOffsets(eventDate, timeZone, now) {
  if (!eventDate || !timeZone || !(now instanceof Date) || Number.isNaN(now.getTime())) return [];
  let start;
  try {
    start = eventStartInstant(eventDate, timeZone);
  } catch {
    return [];
  }
  if (now >= start) return [];
  return REMINDER_OFFSETS_DAYS.filter(offset => fireInstant(eventDate, offset, timeZone) <= now);
}

/**
 * One IANA zone from a coordinate, or null. A border that maps to more than
 * one zone is unknown — we do not pick. Null means no reminder is sent.
 */
export function timeZoneFromCoordinate(lat, lng, findZone = findTimeZone) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  let zones;
  try {
    zones = findZone(lat, lng);
  } catch {
    return null;
  }
  if (!Array.isArray(zones) || zones.length !== 1) return null;
  const zone = zones[0];
  if (typeof zone !== 'string' || !IANA.test(zone)) return null;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: zone }).format(0);
  } catch {
    return null;
  }
  return zone;
}
