/**
 * Time of day. The day palette applies from 5am and the night palette from
 * 8pm, and only inside the app: sign-in and onboarding are always day. The
 * palette is picked once at load because StyleSheets read `colors` at module
 * scope. This file must not import from tokens, which imports it.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reloadAppAsync } from 'expo';
import { hasEntered, markEntered } from './entered';

export const NIGHT_FROM = 20;
export const NIGHT_UNTIL = 5;

export type Mood = 'morning' | 'day' | 'evening' | 'night';

export const moodAt = (d: Date): Mood => {
  const h = d.getHours();
  if (h >= NIGHT_FROM || h < NIGHT_UNTIL) return 'night';
  return h < 10 ? 'morning' : h < 17 ? 'day' : 'evening';
};
export const isNightAt = (d: Date) => moodAt(d) === 'night';

/** Evaluated once when the bundle loads. Tokens uses it to pick the palette. */
export const launchedAtNight = hasEntered() && isNightAt(new Date());

/** The current time, refreshed every `everyMs`. */
export function useNow(everyMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const reloadIfPaletteIsStale = (inside: boolean) => {
  if ((inside && isNightAt(new Date())) !== launchedAtNight) {
    reloadAppAsync('day/night palette').catch(() => {});
  }
};

/**
 * Keeps the palette in step with the clock and with where the user is.
 * `inside` is true in the tabs and false on sign-in and onboarding; `null`
 * while the session is loading. Entering or leaving the app at night reloads
 * into the right palette, as does returning to the foreground after dusk or
 * dawn. `idle` is false while a sheet is open, which blocks the foreground reload.
 * `persists` is false when a reload would lose the session (the mock).
 */
export function useFollowTheClock(inside: boolean | null, idle: boolean, persists: boolean) {
  const ref = useRef({ inside, idle });
  ref.current = { inside, idle };

  useEffect(() => {
    if (inside === null || !persists) return;
    markEntered(inside).then(() => reloadIfPaletteIsStale(inside));
  }, [inside, persists]);

  useEffect(() => {
    if (!persists) return;
    const sub = AppState.addEventListener('change', state => {
      const now = ref.current;
      if (state === 'active' && now.idle && now.inside !== null) reloadIfPaletteIsStale(now.inside);
    });
    return () => sub.remove();
  }, [persists]);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatClock = (d: Date) => ({
  time: `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`,
  meridiem: d.getHours() < 12 ? 'AM' : 'PM',
  date: `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`,
});

export const greetingAt = (d: Date) => {
  const h = d.getHours();
  return h < NIGHT_UNTIL ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon'
    : h < NIGHT_FROM ? 'Good evening' : 'Good night';
};

/** Position of the sun or moon, as fractions of the sky card's width and height. */
export const orbAt = (d: Date) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const t = isNightAt(d) ? (((h - NIGHT_FROM) + 24) % 24) / 9 : (h - NIGHT_UNTIL) / 15;
  return { x: 0.1 + 0.8 * t, y: 0.86 - Math.sin(Math.PI * t) * 0.62 };
};
