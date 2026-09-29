/**
 * Who counts as Pro. Each case is a way the old event-type logic got it wrong.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usersInEvent, entitlementActive, decideFromEvent, fetchSubscriber } from '../revenuecat.mjs';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const NOW = Date.parse('2026-09-29T12:00:00Z');
const ent = (expires, grace) => ({ entitlements: { ruckus_pro: { expires_date: expires, grace_period_expires_date: grace ?? null } } });

test('a lifetime entitlement is active', () => {
  assert.equal(entitlementActive(ent(null), 'ruckus_pro', NOW), true);
});

test('a subscription is active until it expires', () => {
  assert.equal(entitlementActive(ent('2026-10-29T12:00:00Z'), 'ruckus_pro', NOW), true);
  assert.equal(entitlementActive(ent('2026-09-28T12:00:00Z'), 'ruckus_pro', NOW), false);
});

test('a billing grace period still counts', () => {
  assert.equal(entitlementActive(ent('2026-09-28T12:00:00Z', '2026-10-05T12:00:00Z'), 'ruckus_pro', NOW), true);
});

test('owning something else is not Pro', () => {
  const tipJar = { entitlements: { tip_jar: { expires_date: null } } };
  assert.equal(entitlementActive(tipJar, 'ruckus_pro', NOW), false);
  assert.equal(entitlementActive(undefined, 'ruckus_pro', NOW), false);
});

test('a lapsed monthly does not cancel a lifetime purchase', () => {
  // RevenueCat reports the ENTITLEMENT - lifetime keeps it non-expiring even
  // after the monthly product expires. The old logic saw EXPIRATION and revoked.
  assert.equal(entitlementActive(ent(null), 'ruckus_pro', NOW), true);
});

test('a transfer re-checks both accounts', () => {
  const ids = usersInEvent({ type: 'TRANSFER', transferred_from: [A], transferred_to: [B], app_user_id: B });
  assert.deepEqual(ids.sort(), [A, B].sort());
});

test('anonymous and test ids are skipped', () => {
  assert.deepEqual(usersInEvent({ app_user_id: '$RCAnonymousID:abc', aliases: ['test_user'] }), []);
});

test('without the lookup, events for another entitlement change nothing', () => {
  assert.equal(decideFromEvent({ type: 'INITIAL_PURCHASE', entitlement_ids: ['tip_jar'] }, 'ruckus_pro'), null);
  assert.equal(decideFromEvent({ type: 'EXPIRATION', entitlement_ids: ['tip_jar'] }, 'ruckus_pro'), null);
  assert.equal(decideFromEvent({ type: 'INITIAL_PURCHASE', entitlement_ids: ['ruckus_pro'] }, 'ruckus_pro'), true);
  assert.equal(decideFromEvent({ type: 'CANCELLATION', entitlement_ids: ['ruckus_pro'] }, 'ruckus_pro'), null);
});

test('the lookup sends the secret key and reads the subscriber', async () => {
  let seen;
  const fake = async (url, init) => { seen = { url, auth: init.headers.Authorization };
    return { ok: true, json: async () => ({ subscriber: ent(null) }) }; };
  const sub = await fetchSubscriber(A, 'sk_test', fake);
  assert.match(seen.url, new RegExp(`/v1/subscribers/${A}$`));
  assert.equal(seen.auth, 'Bearer sk_test');
  assert.equal(entitlementActive(sub, 'ruckus_pro'), true);
});
