/**
 * score-geocode.mjs - run phase 2 scoring over a finished harness run.
 *
 *   npm run proxy                                  # needs GOOGLE_PLACES_API_KEY
 *   node score-geocode.mjs results/<run>.csv
 *
 * The harness stops at pre-geocode scores, and those barely discriminate:
 * in the 3 Sep run, 39 of 70 candidates scored exactly 5, because
 * "evidence verified + name in caption + not a venue" is the modal reel.
 *
 * §5.7 says the post-geocode signals are the strong ones. This checks that
 * claim: it geocodes every candidate, applies refineWithGeocode, and prints
 * the before/after distribution so the tier thresholds can be set against
 * something real instead of a guess.
 *
 * Writes <run>-geocoded.csv. Costs one Places call per unique query.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { refineWithGeocode, tierOf, explain } from '@ruckus/ingest';

const file = process.argv[2];
const ENDPOINT = process.env.GEOCODE_ENDPOINT || 'http://localhost:3000/geocode';
if (!file) { console.error('usage: node score-geocode.mjs results/<run>.csv'); process.exit(1); }

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...rest] = rows;
  return rest.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const cell = v => {
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * "Banff National Park, Alberta" / "Banff" / "" all appear for the same place
 * (§6). Text Search wants a plain locality; the province and the word
 * "National Park" only make the query worse.
 */
function normaliseCity(city) {
  if (!city) return null;
  return city.split(',')[0].replace(/\b(national park|province|state)\b/gi, '').trim() || null;
}

/**
 * Appending the city helps a venue ("Dual Citizen" + "Toronto") and actively
 * breaks a region: "Lake Louise" + "Banff" returned Banff National Park, and
 * "Percé" + "Gaspé" returned Gaspé. Regions and trails carry their own unique
 * names, so the suffix only gives Text Search something louder to match on.
 */
const wantsCitySuffix = kind => kind === 'venue' || kind === 'accommodation';

async function geocode(query, city) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, city }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  return (await r.json()).results ?? [];
}

const hist = (label, values) => {
  console.log(`\n-- ${label} --`);
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  for (const k of [...counts.keys()].sort((a, b) => a - b)) {
    console.log(`  ${String(k).padStart(4)}  ${'#'.repeat(counts.get(k))} ${counts.get(k)}`);
  }
};

const rows = parseCsv(readFileSync(file, 'utf8'));
const places = rows.filter(r => r.name);
console.log(`${places.length} candidates from ${new Set(rows.map(r => r.url)).size} reels\n`);

const out = [];
let failed = 0;

for (const [i, r] of places.entries()) {
  const city = normaliseCity(r.city);
  const query = r.geocode_query || r.name;
  const pre = { score: Number(r.score), why: (r.reasons || '').split(' ').filter(Boolean), codes: (r.reasons || '').split(' ').filter(x => x && !/^[+-]?\d+$/.test(x)) };

  let results = [], err = null;
  try {
    results = await geocode(query, wantsCitySuffix(r.kind) ? city : null);
  } catch (e) { err = e.message; failed++; }

  const post = refineWithGeocode(pre, { name: r.name }, results, city);
  const best = post.geo;
  const line = explain(post.codes);

  out.push({
    ...r,
    city_normalised: city ?? '',
    pre_score: r.score, pre_tier: r.tier,
    score: post.score, tier: tierOf(post.score),
    google_place_id: best?.placeId ?? '',
    google_name: best?.name ?? '',
    google_address: best?.address ?? '',
    neighbourhood: best?.neighbourhood ?? '',
    lat: best?.lat ?? '', lng: best?.lng ?? '',
    geo_results: results.length,
    explanation: line.text,
    tone: line.tone,
    reasons: post.why.join(' '),
    geocode_error: err ?? '',
  });

  const arrow = post.score > Number(r.score) ? '↑' : post.score < Number(r.score) ? '↓' : '=';
  console.log(
    `[${String(i + 1).padStart(2)}/${places.length}] ${r.name.slice(0, 30).padEnd(30)} ` +
    `${String(r.score).padStart(3)} ${arrow} ${String(post.score).padStart(3)} ${tierOf(post.score).padEnd(6)} ` +
    `${best ? best.name.slice(0, 26) : '(no match)'}`
  );
}

hist('score BEFORE geocode', places.map(r => Number(r.score)));
hist('score AFTER geocode', out.map(r => r.score));

const tiers = ts => {
  const c = { high: 0, medium: 0, low: 0 };
  for (const t of ts) c[t]++;
  return `high ${c.high}  medium ${c.medium}  low ${c.low}`;
};
console.log(`\n  tiers before : ${tiers(places.map(r => r.tier))}`);
console.log(`  tiers after  : ${tiers(out.map(r => r.tier))}`);
console.log(`  no geocode match: ${out.filter(r => r.geo_results === 0).length}`);
if (failed) console.log(`  request failures: ${failed}`);

const cols = ['url', 'caption', 'name', 'kind', 'city', 'city_normalised', 'pre_score', 'pre_tier',
  'score', 'tier', 'explanation', 'tone', 'google_name', 'google_address', 'neighbourhood',
  'google_place_id', 'lat', 'lng', 'geo_results', 'reasons', 'correct?', 'geocode_error'];
const outFile = file.replace(/\.csv$/, '-geocoded.csv');
writeFileSync(outFile, [cols.join(','), ...out.map(r => cols.map(c => cell(r[c])).join(','))].join('\n'));
console.log(`\n${outFile}`);
