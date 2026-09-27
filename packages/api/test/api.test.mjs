/**
 * Offline checks for @ruckus/api. The behaviour that matters - who can see
 * what, the Den limit - lives in the database and is tested by npm run test:db.
 * These cover the client's own job: refusing a dangerous key and turning
 * database errors into something a screen can act on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuckus, RuckusError, ERRORS } from '@ruckus/api';

const jwt = role => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;

test('refuses the service role key', () => {
  assert.throws(() => createRuckus({ url: 'https://x.supabase.co', anonKey: jwt('service_role') }), /SERVICE ROLE/);
  assert.throws(() => createRuckus({ url: 'https://x.supabase.co', anonKey: 'sb_secret_abc' }), /SERVICE ROLE/);
});

test('accepts the anon key', () => {
  const r = createRuckus({ url: 'https://x.supabase.co', anonKey: jwt('anon') });
  for (const k of ['auth', 'profile', 'dens', 'stash', 'confirmations', 'notifications']) assert.ok(r[k], k);
});

test('the paywall error is recognisable', () => {
  const e = new RuckusError('den_limit_reached');
  assert.equal(e.needsUpgrade, true);
  assert.equal(e.message, ERRORS.den_limit_reached);
  assert.equal(new RuckusError('invite_expired').needsUpgrade, false);
});

test('saving nothing fails before it reaches the network', () => {
  const r = createRuckus({ url: 'https://x.supabase.co', anonKey: jwt('anon') });
  assert.throws(() => r.stash.save({ denId: 'd', places: [] }), e => e.code === 'no_places');
});
