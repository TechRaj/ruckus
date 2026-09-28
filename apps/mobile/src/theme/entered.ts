/**
 * Whether the user was inside the app (signed in, with a Den) when it last
 * ran. Sign-in and onboarding always use the day palette, so night only
 * applies once this is true. Boot reads it before anything imports tokens.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ruckus.entered';
let entered = false;

export const hasEntered = () => entered;

export async function readEntered() {
  try { entered = (await AsyncStorage.getItem(KEY)) === '1'; } catch { entered = false; }
  return entered;
}

export async function markEntered(inside: boolean) {
  try {
    if (inside) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch { /* the palette falls back to day on the next launch */ }
}
