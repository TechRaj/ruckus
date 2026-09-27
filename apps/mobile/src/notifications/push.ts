/**
 * Device registration for Den event reminders.
 *
 * Permission is asked once the person has a Den — that is the first moment
 * a reminder could be theirs. A denial is left alone. The token is refreshed
 * when Expo rotates it, and removed on sign-out while the session still
 * exists. Remote push needs a development build: Expo Go on Android cannot
 * obtain a push token from SDK 53 on.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, USE_MOCKS } from '../api/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mock stash ids, so the Expo Go demo can open Grey Gardens. */
const DEMO_ID = /^[a-z][a-z0-9_]{0,32}$/;

export function reminderTarget(data: unknown): { denId: string; placeId: string } | null {
  if (!data || typeof data !== 'object') return null;
  const { denId, placeId } = data as { denId?: unknown; placeId?: unknown };
  if (typeof denId !== 'string' || typeof placeId !== 'string') return null;
  const ok = (id: string) => UUID.test(id) || (USE_MOCKS && DEMO_ID.test(id));
  if (!ok(denId) || !ok(placeId)) return null;
  return { denId, placeId };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;
let mockReminderScheduled = false;
const handledResponses = new Set<string>();

/**
 * Expo Go cannot receive a server push. With the mock Den, schedule the
 * same banner locally so the wording and the tap can be tried on a phone.
 * Grey Gardens is the row Amelia has not voted on.
 */
async function scheduleMockReminder() {
  if (!USE_MOCKS || mockReminderScheduled) return;
  mockReminderScheduled = true;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Grey Gardens',
      body: 'Grey Gardens is tomorrow. Josh, Mia and 1 other want to go. Interested?',
      data: { denId: 'den_1', placeId: 's6' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 8,
    },
  });
}

export async function unregisterCurrentPushToken() {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await api.notifications.unregisterPushToken(token);
  } catch {
    // The session may already be gone. The next account that registers
    // this token takes it over in the database.
  }
}

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

async function registerPushToken() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!USE_MOCKS && !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Event reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted' && existing.canAskAgain) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  if (USE_MOCKS) {
    await scheduleMockReminder();
    return;
  }

  const id = projectId();
  if (!id) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  if (!token || token === currentToken) return;
  await api.notifications.registerPushToken(token, Platform.OS);
  currentToken = token;
}

function responseIdentity(response: Notifications.NotificationResponse) {
  return response.notification.request.identifier;
}

function openFromResponse(
  response: Notifications.NotificationResponse | null,
  onOpen: (target: { denId: string; placeId: string }) => void,
  freshOnly: boolean,
) {
  if (!response) return;
  const id = responseIdentity(response);
  if (handledResponses.has(id)) return;
  // iOS reports seconds since epoch; Android reports milliseconds.
  const at = response.notification.date < 1e12
    ? response.notification.date * 1000
    : response.notification.date;
  if (freshOnly && Date.now() - at > 30_000) return;
  const target = reminderTarget(response.notification.request.content.data);
  if (!target) return;
  handledResponses.add(id);
  onOpen(target);
}

/**
 * Register while the session is ready, and open the event when a reminder
 * is tapped. `onOpen` is read from a ref by the caller so this effect does
 * not re-subscribe on every render.
 */
export function useEventReminders(
  enabled: boolean,
  onOpen: (target: { denId: string; placeId: string }) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    registerPushToken().catch(() => {});

    const opened = (response: Notifications.NotificationResponse) => {
      if (!cancelled) openFromResponse(response, onOpen, false);
    };
    const tap = Notifications.addNotificationResponseReceivedListener(opened);
    const rotated = Notifications.addPushTokenListener(() => {
      registerPushToken().catch(() => {});
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') registerPushToken().catch(() => {});
    });
    Notifications.getLastNotificationResponseAsync()
      .then(response => { if (!cancelled) openFromResponse(response, onOpen, true); })
      .catch(() => {});

    return () => {
      cancelled = true;
      tap.remove();
      rotated.remove();
      appState.remove();
    };
  }, [enabled, onOpen]);
}
