/**
 * run-urls.mjs - run the shipping path over a list of URLs.
 *
 *   npm run proxy                                       # terminal 1
 *   node tools/harness/run-urls.mjs urls.txt out.csv    # terminal 2
 *
 * harness.mjs stops at pre-geocode scores because it predates geocode.js.
 * This calls extractFromReel() - the exact function the app calls - so what
 * it prints is what the confirm screen would show, place ids and all.
 *
 * Use it on URLs the corpus has never seen. A corpus that is all cafes and
 * itineraries is a corpus that will keep passing.
 */

process.env.EXTRACT_ENDPOINT ??= 'http://localhost:3000/extract';
process.env.GEOCODE_ENDPOINT ??= 'http://localhost:3000/geocode';

import { readFileSync, writeFileSync } from 'node:fs';
import { extractFromReel } from '@ruckus/ingest';

const [, , inFile, outFile = 'run.csv'] = process.argv;
if (!inFile) { console.error('usage: node run-urls.mjs <urls.txt> [out.csv]'); process.exit(1); }

const urls = readFileSync(inFile, 'utf8').split('\n').map(s => s.trim()).filter(l => l && !l.startsWith('#'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cell = v => { const s = String(v ?? '').replace(/\r?\n/g, ' '); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// Preflight. extractPlaces() swallows a dead proxy and returns heuristic
// results that look plausible, so a whole run can complete, cost real money,
// and measure the fallback ranker instead of the shipping path. Check first.
const health = process.env.EXTRACT_ENDPOINT.replace(/\/extract$/, '/health');
try {
  const h = await (await fetch(health)).json();
  if (!h.ok) throw new Error('proxy unhealthy');
  console.log(`proxy ok - model=${h.model} geocode=${h.geocode ? 'on' : 'OFF'}`);
  if (!h.geocode) console.log('  GOOGLE_PLACES_API_KEY is unset: no place ids, every candidate -5.\n');
} catch (e) {
  console.error(`proxy unreachable at ${health} (${e.message})`);
  console.error('Start it with `npm run proxy`. Without it this run would measure');
  console.error('ranker.js, not the shipping path, and would not say so.');
  process.exit(1);
}

const rows = [];
const counts = {};
const bump = k => (counts[k] = (counts[k] || 0) + 1);

for (const [i, url] of urls.entries()) {
  const code = url.split(/\/(?:p|reel|tv)\//)[1]?.replace(/[/?].*/, '') ?? url;
  process.stdout.write(`[${String(i + 1).padStart(2)}/${urls.length}] ${code}  `);
  try {
    const r = await extractFromReel(url);
    if (!r.caption && !r.creator) {
      console.log('EMPTY - deleted, private, or age-gated');
      bump('empty'); rows.push({ url, status: 'empty' });
    } else {
      console.log(`${r.engine}  ${r.confirmMode}  ${r.candidates.length} place(s)  city=${r.city ?? '?'}`);
      console.log(`         "${(r.prose || r.caption || '').slice(0, 96).replace(/\s+/g, ' ')}"`);
      bump(`mode_${r.confirmMode}`); bump(`engine_${r.engine}`);
      if (r.engine === 'heuristic') console.log('         !! fell back to heuristic - proxy call failed');
      if (!r.candidates.length) bump('no_places');
      for (const c of r.candidates.slice(0, 4)) {
        console.log(`         ${c.tier.padEnd(6)} ${String(c.score).padStart(3)}  ` +
          `${(c.name || '').slice(0, 32).padEnd(32)} ${(c.kind || '').padEnd(13)} ${c.googlePlaceId ? 'id' : 'NO ID'}`);
        bump(`kind_${c.kind}`);
      }
      const base = { url, status: 'ok', engine: r.engine, mode: r.confirmMode, caption: (r.caption || '').slice(0, 220) };
      if (!r.candidates.length) rows.push(base);
      for (const c of r.candidates) rows.push({
        ...base, name: c.name, kind: c.kind, score: c.score, tier: c.tier,
        placeId: c.googlePlaceId ?? '', address: c.address ?? '',
        says: c.explanation?.text ?? '',
        whenText: c.when?.text ?? '', whenStart: c.when?.start ?? '', whenEnd: c.when?.end ?? '',
        whenRecurring: c.when?.recurring ?? '', headline: c.headline ?? '',
        alsoSeenAs: (c.alsoSeenAs ?? []).join(' '), 'correct?': '',
      });
    }
  } catch (e) {
    console.log(`ERROR ${e.message}`); bump('error');
    rows.push({ url, status: 'error', caption: e.message });
  }
  await sleep(1500);
}

const cols = ['url', 'status', 'engine', 'mode', 'caption', 'name', 'kind', 'score', 'tier', 'placeId', 'address', 'says',
  'whenText', 'whenStart', 'whenEnd', 'whenRecurring', 'headline', 'alsoSeenAs', 'correct?'];
writeFileSync(outFile, [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n'));

console.log('\n' + '='.repeat(52));
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(22)} ${String(v).padStart(3)}`);
}
console.log('-'.repeat(52));
console.log(`  urls ${urls.length}   places ${rows.filter(r => r.name).length}`);
console.log(`\n${outFile}`);
