/**
 * harness.mjs - batch-test the shipping extraction path over a list of reels.
 *
 * It runs @ruckus/ingest - the same modules the app imports - so a fix here
 * is a fix in the app. A row with engine=heuristic is a proxy failure, not a
 * model result; those measure the fallback and must be read separately.
 *
 *   npm run proxy        # in one terminal, key in .env
 *   npm run harness      # in another
 *
 * Writes results-<model>.csv - one file per model, so a three-way comparison
 * doesn't overwrite itself. One row per PLACE, not per reel: a travel reel
 * naming six spots is six rows, because that is what the app has to save.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  parseReelPage, resolveHandle, shortcodeOf, extractPlaces, confirmationMode,
} from '@ruckus/ingest';

const UA = 'Mozilla/5.0 (compatible; facebookexternalhit/1.1)';
const DELAY = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const csvCell = v => {
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: npm run harness');
    process.exit(1);
  }
  if (!process.env.EXTRACT_ENDPOINT) {
    console.error('EXTRACT_ENDPOINT is unset - every call would fail and fall back');
    console.error('to the heuristic ranker, which is the thing you are not testing.');
    console.error('  EXTRACT_ENDPOINT=http://localhost:3000/extract npm run harness');
    process.exit(1);
  }

  const urls = readFileSync(file, 'utf8')
    .split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  const rows = [];
  const counts = {};
  let totalCost = 0;
  let modelSeen = null;
  const bump = k => (counts[k] = (counts[k] || 0) + 1);

  for (const [i, url] of urls.entries()) {
    const code = shortcodeOf(url);
    process.stdout.write(`[${String(i + 1).padStart(2)}/${urls.length}] ${code ?? url}\n`);

    if (!code) { bump('bad_url'); rows.push({ url, status: 'bad_url' }); continue; }

    let parsed;
    try {
      parsed = parseReelPage(await fetchPage(`https://www.instagram.com/reel/${code}/`));
    } catch (e) {
      console.log(`        FETCH FAILED: ${e.message}`);
      bump('fetch_error');
      rows.push({ url, status: 'fetch_error', notes: e.message });
      await sleep(DELAY);
      continue;
    }

    if (!parsed.caption && !parsed.creator) {
      console.log('        EMPTY - deleted, private, or rate-limited');
      bump('empty');
      rows.push({ url, status: 'empty', wrapper_ok: parsed.wrapperOk });
      await sleep(DELAY);
      continue;
    }

    const resolvedNames = {};
    for (const h of parsed.handles.slice(0, 3)) {
      await sleep(DELAY);
      resolvedNames[h] = await resolveHandle(h);
    }

    const result = await extractPlaces(parsed, resolvedNames);
    const confirm = confirmationMode(result.candidates);

    // engine === 'heuristic' means the proxy call failed and it fell back.
    // Those rows measure ranker.js, not the model - count them separately.
    bump(`engine_${result.engine}`);
    if (result.model) modelSeen = result.model;
    totalCost += result.cost ?? 0;
    if (result.engine === 'heuristic') {
      console.log(`        FELL BACK TO HEURISTIC: ${result.error}`);
    }
    bump(`mode_${confirm.mode}`);
    if (!parsed.wrapperOk) bump('wrapper_fail');
    if (!result.candidates.length) bump('no_places');

    console.log(
      `        ${result.candidates.length} place(s)  ${confirm.mode}` +
      `  city=${result.city ?? '?'}  [${result.model ?? result.engine}]`
    );
    for (const c of result.candidates) {
      console.log(`          - ${c.name}  (${c.kind ?? '?'}, ${c.tier ?? '?'} ${c.score})`);
    }
    if (result.notes) console.log(`        note: ${result.notes}`);

    if (!result.candidates.length) {
      rows.push({
        url, status: 'ok', engine: result.engine, model: result.model ?? '',
        wrapper_ok: parsed.wrapperOk,
        creator: parsed.creator, caption: parsed.caption.slice(0, 300),
        city: result.city ?? '', confirm_mode: confirm.mode,
        place_index: 0, place_count: 0, notes: result.notes ?? '',
      });
    }
    // one row per place - an itinerary reel is several saves, not one
    for (const [j, c] of result.candidates.entries()) {
      rows.push({
        url,
        status: 'ok',
        engine: result.engine,
        model: result.model ?? '',
        wrapper_ok: parsed.wrapperOk,
        creator: parsed.creator,
        caption: parsed.caption.slice(0, 300),
        handles: parsed.handles.join(' '),
        resolved: Object.entries(resolvedNames).map(([k, v]) => `${k}=${v ?? '?'}`).join(' | '),
        city: result.city ?? '',
        place_index: j + 1,
        place_count: result.candidates.length,
        name: c.name,
        kind: c.kind ?? '',
        category: c.category ?? '',
        address: c.address ?? '',
        handle: c.handle ?? '',
        score: c.score,
        tier: c.tier ?? '',
        reasons: (c.reasons ?? []).join(' '),
        evidence: c.evidence ?? '',
        geocode_query: c.geocodeQuery ?? '',
        confirm_mode: confirm.mode,
        'correct?': '',       // fill this in by hand - it's the real measurement
        notes: j === 0 ? (result.notes ?? '') : '',
      });
    }

    await sleep(DELAY);
  }

  const cols = ['url', 'status', 'engine', 'model', 'wrapper_ok', 'creator', 'caption',
    'handles', 'resolved', 'city', 'place_index', 'place_count', 'name', 'kind',
    'category', 'address', 'handle', 'score', 'tier', 'reasons', 'evidence', 'geocode_query',
    'confirm_mode', 'correct?', 'notes'];

  const slug = (modelSeen || 'unknown').replace(/[^a-z0-9.]+/gi, '-');
  // Timestamped: a run must never clobber an earlier one. The whole point of
  // the loop is comparing runs, and a hand-labelled CSV is expensive to lose.
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const outFile = `results/${stamp}-${slug}.csv`;
  writeFileSync(outFile,
    [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n'));

  const n = urls.length;
  console.log('\n' + '='.repeat(50));
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${String(v).padStart(3)}   ${(100 * v / n).toFixed(1)}%`);
  }
  console.log('-'.repeat(50));
  console.log(`  reels           ${String(n).padStart(3)}`);
  console.log(`  places found    ${String(rows.filter(r => r.name).length).padStart(3)}`);
  console.log(`  spent           $${totalCost.toFixed(4)}`);
  console.log('='.repeat(50));
  console.log(`\n${outFile} written - one row per place.`);
  console.log("Fill 'correct?' by hand. Check the engine column first: any");
  console.log('heuristic row is a proxy failure, not a model result.');
}

main();
