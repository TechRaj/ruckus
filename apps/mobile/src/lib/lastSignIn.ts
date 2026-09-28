/**
 * What the sign-in screen remembers between visits: the last email that
 * signed in, and whether the person has just signed out. Both live on the
 * device only. With the mock adapter they are held in memory, so every
 * launch starts as a first visit and no real email is read or overwritten.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_MOCKS } from '../api/client';

const memory = { email: null as string | null, signedOut: false };

const EMAIL = 'ruckus.lastEmail';
const SIGNED_OUT = 'ruckus.justSignedOut';

export const lastEmail = async () => {
  if (USE_MOCKS) return memory.email;
  try { return await AsyncStorage.getItem(EMAIL); } catch { return null; }
};

export const rememberEmail = async (email: string) => {
  if (USE_MOCKS) { memory.email = email; return; }
  await AsyncStorage.setItem(EMAIL, email).catch(() => {});
};
export const forgetEmail = async () => {
  if (USE_MOCKS) { memory.email = null; return; }
  await AsyncStorage.removeItem(EMAIL).catch(() => {});
};

/** Stored, not held in memory, because signing out at night reloads the app. */
export const markSignedOut = async () => {
  if (USE_MOCKS) { memory.signedOut = true; return; }
  await AsyncStorage.setItem(SIGNED_OUT, '1').catch(() => {});
};

/** Reads both values. The signed-out flag is cleared once read, so it shows one time. */
export async function readLastSignIn() {
  if (USE_MOCKS) {
    const found = { ...memory };
    memory.signedOut = false;
    return found;
  }
  try {
    const [[, email], [, out]] = await AsyncStorage.multiGet([EMAIL, SIGNED_OUT]);
    if (out) await AsyncStorage.removeItem(SIGNED_OUT);
    return { email, signedOut: out === '1' };
  } catch {
    return { email: null, signedOut: false };
  }
}
