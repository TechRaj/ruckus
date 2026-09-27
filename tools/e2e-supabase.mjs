/**
 * e2e-supabase.mjs - the real flow against the real Supabase project.
 *
 *   npm run e2e:db
 *
 * npm run test:db proves the rules on a local Postgres. This proves the
 * deployed project matches: the migration is applied, RLS is on, the RPCs are
 * reachable through PostgREST, and @ruckus/api talks to it correctly.
 *
 * Creates throwaway users (e2e+...@ruckus.test) with the service role key,
 * plays two friends and a stranger through @ruckus/api with the ANON key -
 * exactly what the app will do - then deletes everything it made.
 */

import { createClient } from '@supabase/supabase-js';
import { createRuckus } from '@ruckus/api';

const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env;
if (!url || !anonKey || !serviceKey) {
  console.error('needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY - run with --env-file=.env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now().toString(36);
const created = [];
let failures = 0;

const ok = (cond, label) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
};
const rejects = async (promise, code, label) => {
  try { await promise; ok(false, `${label} (it succeeded)`); }
  catch (e) { ok(e.code === code, `${label}${e.code === code ? '' : ` (got ${e.code}: ${e.message})`}`); }
};

async function person(name) {
  const email = `e2e+${name}-${stamp}@ruckus.test`;
  const password = `e2e-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: name },
  });
  if (error) throw error;
  created.push(data.user.id);
  const r = createRuckus({ url, anonKey });
  const { error: e2 } = await r.supabase.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return r;
}

// a ResolvedPlace exactly as @ruckus/ingest returns it
const place = (id, name, lat, lng, extra = {}) => ({
  googlePlaceId: `e2e_${stamp}_${id}`, name, coordinate: { lat, lng },
  address: `${name}, Toronto, ON`, neighbourhood: 'Old Toronto', city: 'Toronto',
  kind: 'venue', category: null, when: null, score: 14, tier: 'high',
  reasons: ['evidence_verified +3'], explanation: { text: 'Named in the caption', tone: 'good' },
  sourceUrl: `https://www.instagram.com/reel/E2E${id}/`, ...extra,
});

async function main() {
  const probe = await admin.from('dens').select('id').limit(1);
  if (probe.error) {
    console.error(`The schema isn't on this project yet (${probe.error.message}).`);
    console.error('Apply supabase/migrations first - see supabase/README.md.');
    process.exit(1);
  }

  const alice = await person('Amelia');
  const bob = await person('Josh');
  const carol = await person('Stranger');
  ok(true, 'three users signed up and signed in');

  ok((await alice.profile.me()).display_name === 'Amelia', 'a profile was created from signup metadata');

  const den = await alice.dens.create(`E2E Den ${stamp}`);
  ok(Boolean(den.id), 'alice creates a Den');
  const code = await alice.dens.invite(den.id);
  ok(/^[A-HJ-NP-Z2-9]{6}$/.test(code), `alice gets an invite code (${code})`);

  await bob.dens.join(code.toLowerCase());
  ok((await bob.dens.mine()).some(d => d.id === den.id), 'bob joins with a lower-case code and sees the Den');
  ok((await alice.dens.members(den.id)).length === 2, 'alice sees two members');

  await alice.stash.save({
    denId: den.id,
    places: [
      place('dual', 'Dual Citizen', 43.6509, -79.3843),
      place('lantern', 'Downsview Park', 43.7417, -79.4789,
        { kind: 'region', when: { text: 'September 18–20', start: '2026-09-18', end: '2026-09-20', recurring: null } }),
    ],
    note: 'best latte', engine: 'model',
  });
  await bob.stash.save({ denId: den.id, places: [place('dual', 'Dual Citizen', 43.6509, -79.3843)], note: 'patio' });

  const rows = await bob.stash.list(den.id, { lat: 43.6532, lng: -79.3832 });
  ok(rows.length === 2, 'bob sees both places in the shared Stash');
  const dual = rows.find(r => r.name === 'Dual Citizen');
  ok(dual?.savers.length === 2, 'Dual Citizen shows both savers');
  ok(dual?.distanceM > 0 && dual.distanceM < 1000, `distance comes back (${Math.round(dual?.distanceM)} m)`);
  ok(rows.find(r => r.name === 'Downsview Park')?.when?.start === '2026-09-18', 'the event keeps its date');

  ok((await alice.stash.setWant(den.id, dual.placeId, true)) === 1, 'alice wants to go');
  ok((await bob.stash.setWant(den.id, dual.placeId, true)) === 2, 'bob wants to go');

  await rejects(carol.stash.list(den.id), 'not_a_member', 'a stranger cannot read the Stash');
  ok((await carol.dens.mine()).length === 0, 'a stranger sees no Dens');
  await rejects(carol.dens.join('ZZZZZZ'), 'invite_invalid', 'a wrong code is refused with a usable error');

  const { error: proErr } = await carol.supabase.from('profiles').update({ is_pro: true }).eq('id', await carol.auth.userId());
  ok(Boolean(proErr), 'a user cannot grant themselves Pro through the API');

  await carol.dens.create('One');
  await carol.dens.create('Two');
  try { await carol.dens.create('Three'); ok(false, 'the free limit holds'); }
  catch (e) { ok(e.code === 'den_limit_reached' && e.needsUpgrade, 'the third Den raises the paywall error'); }

  const conf = await alice.confirmations.log({
    mode: 'choose', chosen: [0], engine: 'model',
    offered: [{ ...place('dual', 'Dual Citizen', 0, 0), evidence: 'best latte in the city', caption: 'full caption' }],
  });
  const { data: stored } = await admin.from('confirmations').select('offered').eq('id', conf).single();
  ok(!JSON.stringify(stored.offered).includes('latte') && !JSON.stringify(stored.offered).includes('caption'),
     'captions never reach the confirmations table');
}

async function cleanup() {
  // confirmations outlive their user by design (profile_id -> null), so they
  // have to go first while we can still find them
  if (created.length) await admin.from('confirmations').delete().in('profile_id', created);
  // deleting a user cascades their memberships; then drop empty Dens and test places
  for (const id of created) await admin.auth.admin.deleteUser(id);
  const { data: dens } = await admin.from('dens').select('id, den_members(count)').like('name', `%${stamp}%`);
  for (const d of dens ?? []) await admin.from('dens').delete().eq('id', d.id);
  await admin.from('dens').delete().in('name', ['One', 'Two']).is('created_by', null);
  await admin.from('places').delete().like('google_place_id', `e2e_${stamp}_%`);
}

try {
  await main();
} catch (e) {
  failures++;
  console.error('FAIL  unexpected error:', e.code ?? '', e.message);
} finally {
  await cleanup().catch(e => console.error('cleanup:', e.message));
  console.log(failures ? `\n${failures} failure(s)` : '\nall end-to-end checks passed');
  process.exit(failures ? 1 : 0);
}
