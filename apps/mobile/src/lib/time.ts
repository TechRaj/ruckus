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

/**
 * A saved event's date, as the pipeline read it from the caption. `text` is
 * the caption's own wording; `start` / `end` are only set when the date could
 * be pinned down (CLAUDE.md §9).
 */
export interface EventWhen {
  text: string | null;
  start: string | null;
  end: string | null;
  recurring: string | null;
}

/**
 * The line a saved event shows in its row, in the same words a Caper uses:
 * "Tomorrow", "Friday", "Sat, Oct 3". A run that's under way reads
 * "On till Sep 20"; one that's over reads "Ended Sep 20". Recurring things
 * show their rhythm ("Saturdays"). With no pinned date, the caption's words.
 */
export function eventLabel(when: EventWhen | null | undefined, now = new Date()) {
  if (!when) return null;
  if (when.recurring) return when.recurring;
  if (!when.start) return when.text;
  const today = isoDay(now);
  const last = when.end ?? when.start;
  const short = (day: string) => { const d = fromIsoDay(day); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  if (last < today) return `Ended ${short(last)}`;
  if (when.start <= today) return when.end ? `On till ${short(when.end)}` : 'Tonight';
  return dayLabel(when.start, now);
}

/**
 * Where a place sits in the Date sort: the day it next happens, or null for
 * no date. Something under way counts as today; something over counts as past.
 */
export function eventDay(when: EventWhen | null | undefined, now = new Date()): { day: string; past: boolean } | null {
  if (!when?.start) return null;
  const today = isoDay(now);
  const last = when.end ?? when.start;
  if (last < today) return { day: last, past: true };
  return { day: when.start < today ? today : when.start, past: false };
}
