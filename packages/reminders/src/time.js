/**
 * Place time zones. The clock math lives in clock.js so the phone can import
 * it without this file's Node-only dependency.
 */

import { find as findTimeZone } from 'geo-tz';

export {
  REMINDER_LOCAL_HOUR,
  REMINDER_OFFSETS_DAYS,
  addCalendarDays,
  dueOffsets,
  eventStartInstant,
  fireInstant,
  parseEventClock,
  zonedLocalToUtc,
} from './clock.js';

const IANA = /^(?:UTC|[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)+)$/;

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
