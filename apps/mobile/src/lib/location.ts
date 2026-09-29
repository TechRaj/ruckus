/**
 * Where the user is, for the Nearby sort, distances and the map.
 *
 * Location is native code, so `expo-location` is required lazily: on a build
 * made before it was added, the require fails and the app carries on without a
 * position - Nearby falls back to newest-first, the map to the Stash. Never a
 * crash, never a nag: it asks once, and a "no" is respected.
 *
 * The position goes to the server only as a query parameter, to compute
 * distances. It isn't stored, and friends never see it.
 */
export interface Position { lat: number; lng: number }

type LocationModule = typeof import('expo-location');
const load = (): LocationModule | null => {
  try { return require('expo-location') as LocationModule; } catch { return null; }
};

/** A fix that's a few minutes old is fine for "how far is that café". */
const FRESH_ENOUGH_MS = 10 * 60_000;

/**
 * The user's position, or null if we don't have permission or can't tell.
 * `ask` shows the system prompt the first time; otherwise only a permission
 * already granted is used.
 */
export async function currentPosition({ ask }: { ask: boolean }): Promise<Position | null> {
  const L = load();
  if (!L) return null;
  try {
    let { status, canAskAgain } = await L.getForegroundPermissionsAsync();
    if (status !== 'granted' && ask && canAskAgain) {
      ({ status } = await L.requestForegroundPermissionsAsync());
    }
    if (status !== 'granted') return null;
    const fix = (await L.getLastKnownPositionAsync({ maxAge: FRESH_ENOUGH_MS }))
      ?? (await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced }));
    return fix ? { lat: fix.coords.latitude, lng: fix.coords.longitude } : null;
  } catch {
    return null;
  }
}
