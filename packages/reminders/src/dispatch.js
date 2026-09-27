/**
 * One pass of the reminder job.
 *
 * The database decides who is due and claims each
 * (event, recipient, offset, event date) once. This builds the text from
 * the votes at send time, pushes, and records the outcome. A second pass
 * claims nothing that is already sending or sent.
 *
 * A row left in `sending` — the process died after Expo accepted the push
 * and before we recorded it — is not retried, because a retry could
 * deliver a second alert. A row marked `failed` is retried: Expo rejected
 * it, so nothing was accepted. `skipped` is an obsolete claim (date
 * changed, member left, event deleted or already started).
 */

import { reminderCopy } from './copy.js';
import { publicPushError } from './expo.js';

const PAYLOAD_KEYS = ['denId', 'placeId'];

export function reminderData(denId, placeId) {
  return { denId, placeId };
}

export async function dispatchEventReminders({ db, push, resolveTimeZone, now = new Date() }) {
  const missing = await db.placesMissingTimeZone();
  for (const place of missing) {
    const zone = resolveTimeZone(place.lat, place.lng);
    if (!zone) continue;
    try {
      await db.setPlaceTimeZone(place.id, zone);
    } catch {
      // The zone name was not one Postgres accepts. Leave it unset.
    }
  }

  const claimed = await db.claim(now);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const { sendId } of claimed) {
    const ctx = await db.context(sendId, now);
    if (!ctx?.eligible) {
      await db.finish(sendId, 'skipped', 'no longer eligible');
      skipped += 1;
      continue;
    }
    if (!ctx.tokens?.length) {
      // No device right now. Release the claim so a later registration
      // can still receive this reminder.
      await db.release(sendId);
      skipped += 1;
      continue;
    }

    const body = reminderCopy({
      eventName: ctx.eventName,
      offsetDays: ctx.offsetDays,
      recipientVoted: ctx.recipientVoted,
      otherVoterNames: ctx.otherVoterNames,
    });
    const data = reminderData(ctx.denId, ctx.placeId);
    const messages = ctx.tokens.map(to => ({
      to,
      title: ctx.eventName,
      body,
      sound: 'default',
      data,
    }));
    for (const message of messages) {
      if (Object.keys(message.data).some(key => !PAYLOAD_KEYS.includes(key))) {
        throw new Error('reminder payload has an unexpected field');
      }
    }

    try {
      const results = await push(messages);
      let ok = 0;
      const problems = [];
      for (const result of results) {
        if (result.ticket?.status === 'ok') {
          ok += 1;
          continue;
        }
        if (result.ticket?.details?.error === 'DeviceNotRegistered') {
          await db.disableToken(result.token);
        }
        problems.push(publicPushError(result.ticket?.message || result.ticket?.details?.error || 'push rejected'));
      }
      if (ok > 0) {
        await db.finish(sendId, 'sent', null);
        sent += 1;
      } else {
        await db.finish(sendId, 'failed', problems[0] ?? 'push rejected');
        failed += 1;
      }
    } catch (err) {
      await db.finish(sendId, 'failed', publicPushError(err?.message));
      failed += 1;
    }
  }

  return { claimed: claimed.length, sent, failed, skipped };
}
