/**
 * Day and night. The app follows the clock, night from 8pm to 5am, until the
 * theme switch is used. After that the chosen mode stays. Night applies only
 * inside the app: sign-in and onboarding are always day. The palette is
 * picked once at load because StyleSheets read `colors` at module scope.
 * This file must not import from tokens, which imports it.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reloadAppAsync } from 'expo';
import { Mode, chooseMode, chosenMode, hasEntered, markEntered } from './entered';
import { saveMusicPosition } from './sound';

export const NIGHT_FROM = 20;
export const NIGHT_UNTIL = 5;

export type Mood = 'morning' | 'day' | 'evening' | 'night';

export const moodAt = (d: Date): Mood => {
  const h = d.getHours();
  if (h >= NIGHT_FROM || h < NIGHT_UNTIL) return 'night';
  return h < 10 ? 'morning' : h < 17 ? 'day' : 'evening';
};
export const isNightAt = (d: Date) => moodAt(d) === 'night';

/** The chosen mode if there is one, otherwise the clock. */
const wantsNight = () => (chosenMode() ? chosenMode() === 'night' : isNightAt(new Date()));

/** Evaluated once when the bundle loads. Tokens uses it to pick the palette. */
export const launchedAtNight = hasEntered() && wantsNight();

/** Saves the mode and reloads into it. `after` leaves time for the switch to finish moving. */
export function switchMode(next: Mode, after = 0) {
  Promise.all([chooseMode(next), saveMusicPosition()]).then(() => {
    setTimeout(() => { reloadAppAsync('theme switch').catch(() => {}); }, after);
  });
}

/** The current time, refreshed every `everyMs`. */
export function useNow(everyMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

/** True when the palette on screen is wrong for where the user is, so a reload is coming. */
export const paletteIsStale = (inside: boolean) => (inside && wantsNight()) !== launchedAtNight;

const reloadIfPaletteIsStale = (inside: boolean) => {
  if (paletteIsStale(inside)) {
    saveMusicPosition().then(() => reloadAppAsync('day/night palette')).catch(() => {});
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
    // A share that arrives with this foreground waits for the reload
    // (IncomingShares checks paletteIsStale) and opens on the next run.
    const sub = AppState.addEventListener('change', state => {
      const now = ref.current;
      if (state === 'active' && now.idle && now.inside !== null) reloadIfPaletteIsStale(now.inside);
    });
    return () => sub.remove();
  }, [persists]);
}

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
