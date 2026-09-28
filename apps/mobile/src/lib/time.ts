/** Formats a date as "today", "yesterday", "3d" or "2w". */
export function ago(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/**
 * Joins the non-empty parts with a dot, for example "Little Italy · 1.2 km".
 * Empty parts are skipped, so a place with no distance has no trailing dot.
 */
export const dotted = (...parts: (string | null | undefined)[]) =>
  parts.map(p => p?.trim()).filter(Boolean).join(' · ');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A local calendar day as YYYY-MM-DD. Not `toISOString`, which is UTC and can be a day off. */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromIsoDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The days offered when making a Caper: tonight, then the coming Friday, Saturday and Sunday. */
export function dayChoices(now = new Date()) {
  const choices = [{ label: 'Tonight', date: isoDay(now), short: `${MONTHS[now.getMonth()]} ${now.getDate()}` }];
  for (let ahead = 1; ahead <= 7; ahead++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    if ([5, 6, 0].includes(d.getDay())) {
      choices.push({
        label: WEEKDAYS[d.getDay()].slice(0, 3), date: isoDay(d), short: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
      });
    }
  }
  return choices.slice(0, 4);
}

/** "Tonight", "Tomorrow", "Friday" within a week, otherwise "Fri, Oct 2". */
export function dayLabel(day: string, now = new Date()) {
  const d = fromIsoDay(day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ahead = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (ahead === 0) return 'Tonight';
  if (ahead === 1) return 'Tomorrow';
  if (ahead > 1 && ahead < 7) return WEEKDAYS[d.getDay()];
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** The pieces of a date tile: "FRI" over "2". */
export const dayParts = (day: string) => {
  const d = fromIsoDay(day);
  return { weekday: WEEKDAYS[d.getDay()].slice(0, 3), date: d.getDate() };
};
