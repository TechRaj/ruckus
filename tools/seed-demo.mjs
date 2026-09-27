/**
 * seed-demo.mjs - a full Den for the demo video.
 *
 *   npm run seed:demo -- amelia@x.com quan@x.com shruthi@x.com karthik@x.com
 *
 * The first email owns the Den; everyone listed joins it. Accounts that don't
 * exist yet are created (confirmed, no email sent) - when that person later
 * signs in with their emailed code, it's the same account.
 *
 * Acts as each person through @ruckus/api with a real session, exactly like
 * the app, so every database rule applies to the demo data too: membership,
 * the free Den limit, invite codes. Sessions come from a sign-in code minted
 * with the admin key, which sends no email.
 *
 * Places are looked up live through the proxy's /geocode, so the ids and pins
 * are real. Nothing here comes from tools/harness/results/ - those files hold
 * scraped captions and stay out of the repo.
 *
 * Safe to run again: saves, votes and takes are all upserts. Needs
 * SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and PROXY_SECRET.
 */

import { createClient } from '@supabase/supabase-js';
import { createRuckus } from '@ruckus/api';

const DEN_NAME = process.env.SEED_DEN_NAME || 'Toronto Shenanigans';
const PROXY = (process.env.PROXY_URL || 'https://ruckus-production-1747.up.railway.app').replace(/\/$/, '');
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey, PROXY_SECRET } = process.env;

const emails = process.argv.slice(2).map(e => e.trim().toLowerCase()).filter(Boolean);
if (!emails.length) {
  console.error('usage: npm run seed:demo -- owner@example.com friend@example.com [...]');
  process.exit(1);
}
for (const [k, v] of Object.entries({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey, PROXY_SECRET })) {
  if (!v) { console.error(`${k} is unset - run with --env-file=.env`); process.exit(1); }
}

/**
 * Real Toronto spots, a mix the Places screen shows off: food, drink, things
 * to do, two events with dates and one weekly thing. `by` is an index into
 * the emails - so with fewer people, saves wrap round.
 */
const PLACES = [
  { q: 'Bar Raval',                    kind: 'venue',  category: 'cocktail bar', by: 0, note: 'Tiny plates, big Friday energy' },
  { q: 'Grey Gardens',                 kind: 'venue',  category: 'restaurant',   by: 1, note: "Josh won't shut up about the pierogi" },
  { q: 'Bellwoods Brewery',            kind: 'venue',  category: 'brewery',      by: 2, note: 'Patio, and you can take cans home' },
  { q: 'Pai Northern Thai Kitchen',    kind: 'venue',  category: 'thai restaurant', by: 3, note: 'Worth the queue. Go at 5.' },
  { q: 'Sam James Coffee Bar',         kind: 'venue',  category: 'coffee',       by: 0, note: 'Best cortado on Harbord' },
  { q: 'Trinity Bellwoods Park',       kind: 'region', category: 'park',         by: 1, note: 'Picnic before it gets cold' },
  { q: 'Kensington Market',            kind: 'region', category: 'market',       by: 2, note: 'Thrift, then empanadas' },
  { q: 'Queen Mother Cafe',            kind: 'venue',  category: 'restaurant',   by: 3, note: 'The khao soi is the move' },
  { q: 'Allan Gardens Conservatory Palm House', kind: 'venue', category: 'garden',       by: 0, note: 'Free, warm, full of cacti' },
  { q: "Ward's Island Beach",          kind: 'region', category: 'beach',        by: 1, note: 'Ferry over, bikes back' },
  { q: 'Aga Khan Museum',              kind: 'venue',  category: 'museum',       by: 2, note: 'The courtyard alone is worth it' },
  { q: 'The Rex Hotel Jazz & Blues Bar', kind: 'venue', category: 'jazz bar',   by: 3, note: 'No cover before 9',
    when: { text: 'Live jazz every night', start: null, end: null, recurring: 'Every night' } },
  { q: 'Evergreen Brick Works',        kind: 'venue',  category: 'market',       by: 0, note: 'Saturday market, then the trails',
    when: { text: 'Saturday farmers market', start: null, end: null, recurring: 'Saturdays, 8am-1pm' } },
  { q: 'Nathan Phillips Square',       kind: 'event',  category: 'art festival', by: 1, note: 'All-night art, we are doing it',
    when: { text: 'Nuit Blanche, Oct 3', start: '2026-10-03', end: '2026-10-04', recurring: null } },
  { q: 'Christie Pits Park',           kind: 'region', category: 'park',         by: 2, note: 'Outdoor movie nights',
    when: { text: 'Oct 10', start: '2026-10-10', end: null, recurring: null } },
];

/** Who else wants to go, as indexes into the emails. */
const WANTS = [[1, 2], [0, 2, 3], [0, 1, 3], [0, 1], [2], [0, 3], [1, 3], [0, 2], [], [0, 2, 3], [3], [0, 1, 2], [1], [0, 2, 3], [1]];
const TAKES = [
  [0, 1, 'the mushroom toast though'],
  [2, 3, 'bringing my cousin'],
  [3, 0, 'I will be there at 5:01'],
  [13, 2, 'first one to the Eaton Centre piece wins'],
  [11, 0, 'Thursday?'],
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findOrCreateUser(email) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(u => u.email?.toLowerCase() === email);
    if (hit) return { id: hit.id, created: false };
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email, email_confirm: true,
    user_metadata: { display_name: email.split('@')[0].split(/[._+-]/)[0].replace(/^./, c => c.toUpperCase()) },
  });
  if (error) throw error;
  return { id: data.user.id, created: true };
}

/** A real signed-in session for this person, without sending them an email. */
async function sessionFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const r = createRuckus({ url, anonKey });
  const { error: e2 } = await r.supabase.auth.verifyOtp({ email, token: data.properties.email_otp, type: 'email' });
  if (e2) throw e2;
  return r;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geocode(q) {
  // The proxy allows 20 calls a minute per caller. One run fits; two runs back
  // to back don't. Wait the window out rather than fail halfway through.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${PROXY}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ruckus-key': PROXY_SECRET },
      body: JSON.stringify({ query: q, city: 'Toronto' }),
    });
    if (res.status === 429) {
      if (attempt === 0) process.stdout.write('  (proxy rate limit - waiting a minute)\n');
      await sleep(20_000);
      continue;
    }
    if (!res.ok) throw new Error(`geocode "${q}" -> ${res.status}`);
    return (await res.json()).results?.[0] ?? null;
  }
  throw new Error(`geocode "${q}" still rate-limited after ~100s`);
}

async function main() {
  console.log(`seeding "${DEN_NAME}" for ${emails.length} people via ${PROXY}\n`);

  const people = [];
  for (const email of emails) {
    const { id, created } = await findOrCreateUser(email);
    people.push({ email, id, api: await sessionFor(email) });
    console.log(`  ${created ? 'created' : 'found  '}  ${email}`);
  }
  const owner = people[0];

  // reuse the owner's Den of this name if a previous run made it
  let den = (await owner.api.dens.mine()).find(d => d.name === DEN_NAME);
  if (!den) {
    try { den = await owner.api.dens.create(DEN_NAME); }
    catch (e) {
      if (e.code === 'den_limit_reached') {
        console.error(`\n${owner.email} is already in 3 Dens (the free limit). Leave one, or make them Pro, and re-run.`);
        process.exit(1);
      }
      throw e;
    }
    console.log(`\n  made Den "${den.name}"`);
  } else {
    console.log(`\n  reusing Den "${den.name}"`);
  }

  const code = await owner.api.dens.invite(den.id);
  for (const p of people.slice(1)) {
    try { await p.api.dens.join(code); }
    catch (e) {
      console.error(`  ${p.email} couldn't join: ${e.code}${e.code === 'den_limit_reached' ? ' (already in 3 Dens)' : ''}`);
    }
  }
  console.log(`  ${people.length} members, invite code ${code}\n`);

  const saved = [];
  for (const [i, spec] of PLACES.entries()) {
    const g = await geocode(spec.q);
    if (!g) { console.log(`  skip     ${spec.q} (no match)`); saved.push(null); continue; }
    const who = people[spec.by % people.length];
    const place = {
      googlePlaceId: g.placeId, name: g.name, address: g.address,
      neighbourhood: g.neighbourhood, city: g.city ?? 'Toronto',
      coordinate: { lat: g.lat, lng: g.lng },
      kind: spec.kind, category: spec.category, when: spec.when ?? null,
      score: 12, tier: 'high',
    };
    const [row] = await who.api.stash.save({
      denId: den.id, places: [place], note: spec.note, engine: 'manual', sourceKind: 'manual',
    });
    saved.push(row.place_id);
    console.log(`  saved    ${g.name.padEnd(34)} by ${who.email.split('@')[0]}${spec.when ? `  (${spec.when.text})` : ''}`);
  }

  let votes = 0;
  for (const [i, wanters] of WANTS.entries()) {
    if (!saved[i]) continue;
    for (const w of wanters) {
      if (w >= people.length) continue;
      await people[w].api.stash.setWant(den.id, saved[i], true);
      votes++;
    }
  }
  let takes = 0;
  for (const [i, w, text] of TAKES) {
    if (!saved[i] || w >= people.length) continue;
    await people[w].api.takes.set(den.id, saved[i], text);
    takes++;
  }

  const rows = await owner.api.stash.list(den.id);
  console.log(`\n  ${rows.length} places, ${votes} want-to-go votes, ${takes} takes`);
  console.log(`  events with dates: ${rows.filter(r => r.when?.start).length}, weekly: ${rows.filter(r => r.when?.recurring).length}`);
  console.log(`\ndone - sign in as ${owner.email} to see it`);
}

main().catch(e => {
  console.error(`\nseed failed: ${e.code ?? ''} ${e.message}`);
  process.exit(1);
});
