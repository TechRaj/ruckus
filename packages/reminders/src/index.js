export {
  REMINDER_LOCAL_HOUR,
  REMINDER_OFFSETS_DAYS,
  addCalendarDays,
  dueOffsets,
  eventStartInstant,
  fireInstant,
  timeZoneFromCoordinate,
  zonedLocalToUtc,
} from './time.js';
export { reminderCopy } from './copy.js';
export { EXPO_PUSH_URL, publicPushError, sendExpoPush } from './expo.js';
export { dispatchEventReminders, reminderData } from './dispatch.js';
export { createSupabaseReminderDb } from './supabase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only fields a reminder tap is allowed to carry. */
export function reminderTarget(data) {
  if (!data || typeof data !== 'object') return null;
  const { denId, placeId } = data;
  if (typeof denId !== 'string' || typeof placeId !== 'string') return null;
  if (!UUID.test(denId) || !UUID.test(placeId)) return null;
  return { denId, placeId };
}
