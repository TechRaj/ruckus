/**
 * Two things the palette depends on, both read by Boot before anything
 * imports tokens. `entered` is whether the user was inside the app (signed
 * in, with a Den) when it last ran: sign-in and onboarding always use the day
 * palette. `mode` is the choice made with the theme switch, or null while the
 * app is still following the clock.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Mode = 'day' | 'night';

const ENTERED = 'ruckus.entered';
const MODE = 'ruckus.mode';
let entered = false;
let mode: Mode | null = null;

export const hasEntered = () => entered;
export const chosenMode = () => mode;

export async function readEntered() {
  try {
    const [[, e], [, m]] = await AsyncStorage.multiGet([ENTERED, MODE]);
    entered = e === '1';
    mode = m === 'day' || m === 'night' ? m : null;
  } catch {
    entered = false;
    mode = null;
  }
  return entered;
}

export async function markEntered(inside: boolean) {
  try {
    if (inside) await AsyncStorage.setItem(ENTERED, '1');
    else await AsyncStorage.removeItem(ENTERED);
  } catch { /* the palette falls back to day on the next launch */ }
}

export async function chooseMode(next: Mode) {
  mode = next;
  try { await AsyncStorage.setItem(MODE, next); } catch { /* the choice lasts until the app closes */ }
}
