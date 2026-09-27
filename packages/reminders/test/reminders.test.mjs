import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REMINDER_LOCAL_HOUR,
  addCalendarDays,
  dueOffsets,
  fireInstant,
  reminderCopy,
  reminderTarget,
  timeZoneFromCoordinate,
  zonedLocalToUtc,
  dispatchEventReminders,
  publicPushError,
  sendExpoPush,
  EXPO_PUSH_URL,
} from '@ruckus/reminders';

const TORONTO = 'America/Toronto';
const at = iso => new Date(iso);

test('delivery hour is 09:00 local', () => {
  assert.equal(REMINDER_LOCAL_HOUR, 9);
});

test('calendar day arithmetic ignores the host zone', () => {
  assert.equal(addCalendarDays('2026-03-10', -7), '2026-03-03');
  assert.equal(addCalendarDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addCalendarDays('2026-03-10', -1), '2026-03-09');
});

test('09:00 America/Toronto across the March and November daylight saving changes', () => {
  // 2026-03-08 is the spring-forward day. 09:00 is after the change, so EDT (UTC-4).
  assert.equal(zonedLocalToUtc('2026-03-07', 9, TORONTO).toISOString(), '2026-03-07T14:00:00.000Z');
  assert.equal(zonedLocalToUtc('2026-03-08', 9, TORONTO).toISOString(), '2026-03-08T13:00:00.000Z');
  assert.equal(zonedLocalToUtc('2026-03-09', 9, TORONTO).toISOString(), '2026-03-09T13:00:00.000Z');
  // 2026-11-01 is the fall-back day. 09:00 is after the change, so EST (UTC-5).
  assert.equal(zonedLocalToUtc('2026-10-31', 9, TORONTO).toISOString(), '2026-10-31T13:00:00.000Z');
  assert.equal(zonedLocalToUtc('2026-11-01', 9, TORONTO).toISOString(), '2026-11-01T14:00:00.000Z');
  // A half-hour zone, so the conversion is not just a whole-hour shift.
  assert.equal(zonedLocalToUtc('2026-01-15', 9, 'America/St_Johns').toISOString(), '2026-01-15T12:30:00.000Z');
});

test('7, 3, and 1 day reminders become due at 09:00 local and stop at the event', () => {
  const event = '2026-03-10';
  assert.deepEqual(dueOffsets(event, TORONTO, at('2026-03-03T13:59:00.000Z')), []);
  assert.deepEqual(dueOffsets(event, TORONTO, at('2026-03-03T14:00:00.000Z')), [7]);
  // 3 days before is still EST. 1 day before is already EDT.
  assert.equal(fireInstant(event, 3, TORONTO).toISOString(), '2026-03-07T14:00:00.000Z');
  assert.equal(fireInstant(event, 1, TORONTO).toISOString(), '2026-03-09T13:00:00.000Z');
  assert.deepEqual(dueOffsets(event, TORONTO, at('2026-03-09T13:00:00.000Z')), [7, 3, 1]);
  assert.deepEqual(dueOffsets(event, TORONTO, at('2026-03-10T13:00:00.000Z')), []);
  assert.deepEqual(dueOffsets(event, null, at('2026-03-09T13:00:00.000Z')), []);
  assert.deepEqual(dueOffsets('not-a-date', TORONTO, at('2026-03-09T13:00:00.000Z')), []);
});

test('copy follows the vote, and does not invent names', () => {
  const base = { eventName: 'Toronto Night Market', otherVoterNames: ['Quan', 'Mia'] };
  assert.equal(
    reminderCopy({ ...base, offsetDays: 7, recipientVoted: false }),
    'Toronto Night Market is next week. Mia and Quan want to go. Interested?',
  );
  assert.equal(
    reminderCopy({ ...base, offsetDays: 3, recipientVoted: false }),
    'Toronto Night Market is in 3 days. Mia and Quan want to go. Interested?',
  );
  assert.equal(
    reminderCopy({ ...base, offsetDays: 1, recipientVoted: false, otherVoterNames: ['Mia'] }),
    'Toronto Night Market is tomorrow. Mia wants to go. Interested?',
  );
  assert.equal(
    reminderCopy({ ...base, offsetDays: 1, recipientVoted: true }),
    'Toronto Night Market is tomorrow. You and 2 friends want to go.',
  );
  assert.equal(
    reminderCopy({ ...base, offsetDays: 7, recipientVoted: true, otherVoterNames: ['Mia'] }),
    'Toronto Night Market is next week. You and 1 friend want to go.',
  );
  assert.equal(
    reminderCopy({ eventName: 'Toronto Night Market', offsetDays: 7, recipientVoted: false, otherVoterNames: [] }),
    'Toronto Night Market is next week. Interested?',
  );
  assert.equal(
    reminderCopy({ eventName: 'Toronto Night Market', offsetDays: 1, recipientVoted: true, otherVoterNames: [] }),
    'Toronto Night Market is tomorrow. You want to go.',
  );
  assert.equal(
    reminderCopy({
      eventName: 'Toronto Night Market', offsetDays: 3, recipientVoted: false,
      otherVoterNames: ['Sam', 'Quan', 'Mia', 'Lee'],
    }),
    'Toronto Night Market is in 3 days. Lee, Mia and 2 others want to go. Interested?',
  );
});

test('a coordinate becomes one time zone, or none', () => {
  assert.equal(timeZoneFromCoordinate(43.6532, -79.3832), TORONTO);
  assert.equal(timeZoneFromCoordinate(43.65, -79.38, () => ['America/Toronto', 'America/New_York']), null);
  assert.equal(timeZoneFromCoordinate(0, 0, () => []), null);
  assert.equal(timeZoneFromCoordinate(null, -79), null);
});

test('a reminder tap only accepts the den and the place', () => {
  const denId = '11111111-1111-1111-1111-111111111111';
  const placeId = '22222222-2222-2222-2222-222222222222';
  assert.deepEqual(reminderTarget({ denId, placeId, sourceUrl: 'https://instagram.com/p/x' }), { denId, placeId });
  assert.equal(reminderTarget({ denId, placeId: 'nope' }), null);
  assert.equal(reminderTarget(null), null);
});

test('stored errors do not keep push tokens', () => {
  assert.equal(
    publicPushError('DeviceNotRegistered ExponentPushToken[secretvalue123456]'),
    'DeviceNotRegistered [token]',
  );
});

function memoryDb(seed = {}) {
  const state = {
    zones: new Map(seed.zones ?? []),
    missing: seed.missing ?? [],
    claims: 0,
    due: seed.due ?? [],
    contexts: new Map(seed.contexts ?? []),
    finished: [],
    released: [],
    disabled: [],
  };
  return {
    state,
    async placesMissingTimeZone() { return state.missing; },
    async setPlaceTimeZone(id, zone) { state.zones.set(id, zone); },
    async claim() {
      state.claims += 1;
      if (state.claims > 1) return [];
      return state.due.map(sendId => ({ sendId }));
    },
    async context(sendId) { return state.contexts.get(sendId) ?? null; },
    async finish(sendId, status, error) { state.finished.push({ sendId, status, error }); },
    async release(sendId) { state.released.push(sendId); },
    async disableToken(token) { state.disabled.push(token); },
  };
}

const DEN = '11111111-1111-1111-1111-111111111111';
const PLACE = '22222222-2222-2222-2222-222222222222';

test('dispatch sends the current vote, once, and never a reel url', async () => {
  const pushes = [];
  const db = memoryDb({
    missing: [{ id: PLACE, lat: 43.65, lng: -79.38 }],
    due: ['send-1'],
    contexts: [['send-1', {
      eligible: true,
      denId: DEN,
      placeId: PLACE,
      eventName: 'Toronto Night Market',
      offsetDays: 7,
      recipientVoted: false,
      otherVoterNames: ['Mia', 'Quan'],
      tokens: ['ExponentPushToken[device-a]', 'ExponentPushToken[device-b]'],
    }]],
  });
  const first = await dispatchEventReminders({
    db, now: at('2026-03-03T14:00:00.000Z'),
    resolveTimeZone: () => TORONTO,
    push: async messages => {
      pushes.push(messages);
      return messages.map(message => ({ token: message.to, ticket: { status: 'ok', id: 't' } }));
    },
  });
  assert.equal(first.sent, 1);
  assert.equal(db.state.zones.get(PLACE), TORONTO);
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0][0].body, 'Toronto Night Market is next week. Mia and Quan want to go. Interested?');
  assert.deepEqual(pushes[0][0].data, { denId: DEN, placeId: PLACE });
  assert.equal(JSON.stringify(pushes[0]).includes('instagram'), false);
  assert.equal(pushes[0].length, 2);

  db.state.contexts.set('send-1', {
    ...db.state.contexts.get('send-1'),
    recipientVoted: true,
    otherVoterNames: ['Mia', 'Quan'],
    offsetDays: 1,
  });
  const second = await dispatchEventReminders({
    db, now: at('2026-03-09T13:00:00.000Z'),
    resolveTimeZone: () => TORONTO,
    push: async () => { throw new Error('should not send twice'); },
  });
  assert.deepEqual(second, { claimed: 0, sent: 0, failed: 0, skipped: 0 });
});

test('an edited-away or deleted event is not sent', async () => {
  const db = memoryDb({
    due: ['gone'],
    contexts: [['gone', null]],
  });
  const result = await dispatchEventReminders({
    db, resolveTimeZone: () => null, push: async () => [],
  });
  assert.equal(result.skipped, 1);
  assert.deepEqual(db.state.finished, [{ sendId: 'gone', status: 'skipped', error: 'no longer eligible' }]);
});

test('a failed device is disabled and does not duplicate a delivered sibling', async () => {
  const db = memoryDb({
    due: ['send-1'],
    contexts: [['send-1', {
      eligible: true, denId: DEN, placeId: PLACE, eventName: 'Market', offsetDays: 1,
      recipientVoted: true, otherVoterNames: [], tokens: ['ExponentPushToken[dead]', 'ExponentPushToken[live]'],
    }]],
  });
  await dispatchEventReminders({
    db, resolveTimeZone: () => null,
    push: async messages => messages.map(message => ({
      token: message.to,
      ticket: message.to.includes('dead')
        ? { status: 'error', message: `bad ${message.to}`, details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: 'ok' },
    })),
  });
  assert.deepEqual(db.state.disabled, ['ExponentPushToken[dead]']);
  assert.equal(db.state.finished[0].status, 'sent');
  assert.equal(db.state.finished[0].error, null);
});

test('sendExpoPush posts to Expo and does not call a real network in this test', async () => {
  let url;
  const results = await sendExpoPush(
    [{ to: 'ExponentPushToken[abc]', title: 'Market', body: 'Tomorrow.', data: { denId: DEN, placeId: PLACE } }],
    {
      fetchImpl: async (pushed, init) => {
        url = pushed;
        assert.equal(JSON.parse(init.body)[0].data.sourceUrl, undefined);
        return { ok: true, text: async () => JSON.stringify({ data: [{ status: 'ok', id: 'ticket' }] }) };
      },
    },
  );
  assert.equal(url, EXPO_PUSH_URL);
  assert.equal(results[0].ticket.status, 'ok');
});
