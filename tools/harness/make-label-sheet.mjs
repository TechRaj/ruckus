/**
 * make-label-sheet.mjs - turn a harness run into something a human can label.
 *
 *   node make-label-sheet.mjs results/<run>.csv
 *
 * The full CSV is 23 columns wide, which is the right shape for analysis and
 * the wrong shape for sitting down and judging 70 rows. This writes a narrow
 * sheet: one block per reel, the caption once, then its candidates, with an
 * empty `correct?` column to fill in.
 *
 * Put y / n / partial in `correct?`:
 *   y        this place is really in the reel and the name is right
 *   n        wrong place, or a hallucination
 *   partial  right place, wrong branch or a sloppy name
 *
 * The point is not the total. It is finding the rows where a high score was
 * wrong, and the rows where a low score was right - those two sets are what
 * the thresholds in confidence.js are currently guessing at.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node make-label-sheet.mjs results/<run>.csv'); process.exit(1); }

/** minimal RFC-4180 reader - the captions contain commas and quotes */
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

const rows = parseCsv(readFileSync(file, 'utf8'));

// group by reel so the caption is read once, not once per candidate
const byReel = new Map();
for (const r of rows) {
  if (!byReel.has(r.url)) byReel.set(r.url, []);
  byReel.get(r.url).push(r);
}

const cols = ['reel', 'caption', '#', 'place', 'kind', 'score', 'tier', 'why', 'correct?', 'notes'];
const out = [cols.join(',')];

for (const [url, group] of byReel) {
  const first = group[0];
  if (first.status !== 'ok' || !first.name) {
    out.push([url, cell(first.caption?.slice(0, 160) ?? ''), '', `(${first.status})`, '', '', '', '', '', ''].map(cell).join(','));
    out.push('');
    continue;
  }
  group.forEach((r, i) => {
    out.push([
      i === 0 ? url : '',
      i === 0 ? (r.caption ?? '').slice(0, 160) : '',
      r.place_index, r.name, r.kind, r.score, r.tier,
      (r.reasons ?? '').replace(/\s+/g, ' '),
      '', '',
    ].map(cell).join(','));
  });
  out.push('');   // blank line between reels - it is a lot easier to read
}

const outFile = file.replace(/\.csv$/, '-TO-LABEL.csv');
writeFileSync(outFile, out.join('\n'));
console.log(`${outFile}`);
console.log(`${byReel.size} reels, ${rows.filter(r => r.name).length} candidates to judge.`);
