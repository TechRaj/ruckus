/**
 * Device registration for Den event reminders. Permission is requested once
 * the user has a Den. A server push needs a development build. Expo Go can
 * grant permission and still never show that push, so it schedules the
 * reminder on the phone instead.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { fireInstant, futureOffsets, parseEventClock } from '@ruckus/reminders/clock';
import { reminderCopy } from '@ruckus/reminders/copy';
import { api, USE_MOCKS } from '../api/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Matches mock ids such as `den_1`. Accepted only when USE_MOCKS is on. */
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
const handledResponses = new Set<string>();

export type ReminderSource = {
  denId: string;
  userId: string;
  members: { userId: string; displayName: string }[];
  events: { id: string; name: string; start: string | null; time?: string | null; iWant: boolean; interested: string[] }[];
};

function reminderIdentifier(denId: string, eventId: string, offsetDays: number, start: string, clockKey: string) {
  return `den-reminder-${denId}:${eventId}:${offsetDays}:${start}:${clockKey}`;
}

/** Expo Go cannot receive a server push, so future reminders are scheduled on the phone for their clock time. */
async function scheduleStashReminder(source: ReminderSource) {
  let zone = 'UTC';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return;
  }
  const now = new Date();
  const names = new Map(source.members.map(member => [member.userId, member.displayName]));
  const planned: { identifier: string; event: ReminderSource['events'][number]; offsetDays: 7 | 3 | 1; fire: Date }[] = [];
  for (const event of source.events) {
    if (!event.start) continue;
    const clock = parseEventClock(event.time);
    const clockKey = clock ? `${clock.hour}:${clock.minute}` : '9';
    for (const offsetDays of futureOffsets(event.start, zone, now, clock)) {
      const fire = fireInstant(event.start, offsetDays, zone, clock);
      if (fire.getTime() <= now.getTime()) continue;
      planned.push({
        identifier: reminderIdentifier(source.denId, event.id, offsetDays, event.start, clockKey),
        event,
        offsetDays: offsetDays as 7 | 3 | 1,
        fire,
      });
    }
  }
  const wanted = new Set(planned.map(item => item.identifier));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.map(n => {
    const data = n.content.data as { kind?: string; placeId?: string } | undefined;
    const ours = data?.kind === 'den-reminder' || data?.placeId === 's6' || n.content.body?.includes('Josh, Mia');
    if (!ours || wanted.has(n.identifier)) return Promise.resolve();
    return Notifications.cancelScheduledNotificationAsync(n.identifier);
  }));
  const already = new Set(scheduled.map(n => n.identifier));
  await Promise.all(planned.map(item => {
    if (already.has(item.identifier)) return Promise.resolve();
    const body = reminderCopy({
      eventName: item.event.name,
      offsetDays: item.offsetDays,
      recipientVoted: item.event.iWant,
      otherVoterNames: item.event.interested
        .filter(id => id !== source.userId)
        .map(id => names.get(id) ?? '')
        .filter(Boolean),
    });
    return Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content: {
        title: item.event.name,
        body,
        data: { kind: 'den-reminder', denId: source.denId, placeId: item.event.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.fire,
      },
    });
  }));
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

function inExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

async function registerPushToken(source: ReminderSource | null) {
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

  const id = projectId();
  if (USE_MOCKS || !id || inExpoGo()) {
    if (source) await scheduleStashReminder(source);
    return;
  }
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
 * Registers the device while `enabled` is true and calls `onOpen` when a
 * reminder is tapped. Pass a stable `onOpen`, because a new function
 * re-subscribes the listeners.
 */
export function useEventReminders(
  enabled: boolean,
  onOpen: (target: { denId: string; placeId: string }) => void,
  source: ReminderSource | null,
) {
  const sourceKey = source
    ? `${source.denId}:${source.userId}:${source.events.map(event => `${event.id}:${event.start}:${event.time ?? ''}:${event.iWant}:${event.interested.join(',')}`).join('|')}`
    : '';
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    registerPushToken(source).catch(() => {});

    const opened = (response: Notifications.NotificationResponse) => {
      if (!cancelled) openFromResponse(response, onOpen, false);
    };
    const tap = Notifications.addNotificationResponseReceivedListener(opened);
    const rotated = Notifications.addPushTokenListener(() => {
      registerPushToken(source).catch(() => {});
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') registerPushToken(source).catch(() => {});
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
  }, [enabled, onOpen, sourceKey]);
}
