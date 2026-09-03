/**
 * confidence.js - deterministic scoring. No model self-reports.
 *
 * Haiku returned 0.95 for nearly every place across 94 rows, which makes
 * confidence-based routing meaningless. An LLM's stated confidence is not a
 * measurement. Logprobs would be one, but the Messages API doesn't expose them.
 *
 * So: score each candidate on facts we can verify ourselves.
 *
 *   pre-geocode   is the name really in the caption? did a handle resolve?
 *                 is there an address? did the model quote real text?
 *   post-geocode  did an independent source find exactly this place, here?
 *
 * Every input is checkable, so every score is explainable. Each candidate
 * carries `reasons` (debug strings) and `codes` (the same signals, structured).
 * `explain(codes)` turns them into the one line the confirm card shows.
 */

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Crude token overlap, enough to tell "Thindi Café" from "Thai Basil".
 *
 * Containment is checked first because trigram overlap divides by the LONGER
 * name, so a correct short name inside a longer official one scored terribly:
 * "Bow Lake" vs "Bow Lake Viewpoint", "Fuego" vs "Volcán de Fuego", "Ruta del
 * Cares" vs "La Ruta del Cares" were all being penalised -3 as mismatches in
 * the 3 Sep run. Google returns the official name; creators write the short one.
 */
function nameSimilarity(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  // one name wholly inside the other, and not a trivially short fragment
  if ((x.includes(y) || y.includes(x)) && Math.min(x.length, y.length) >= 4) return 0.85;

  const A = new Set(x.match(/.{1,3}/g) || []);
  const B = new Set(y.match(/.{1,3}/g) || []);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.max(A.size, B.size);
}

/**
 * Accumulates score, human-readable debug strings, and structured codes at
 * once, so the three can never drift apart. They did before: the copy on the
 * confirm card was being reverse-engineered from the debug string.
 */
function tally(startScore = 0, startWhy = [], startCodes = []) {
  let score = startScore;
  const why = [...startWhy];
  const codes = [...startCodes];
  return {
    add(code, delta) {
      score += delta;
      codes.push(code);
      why.push(`${code} ${delta >= 0 ? '+' : ''}${delta}`);
    },
    get result() { return { score, why, codes }; },
  };
}

/* ------------------------------------------------------------------ *
 * Phase 1 - before geocoding
 * ------------------------------------------------------------------ */

export function scoreCandidate(place, parsed, resolvedNames = {}) {
  const t = tally();
  const caption = norm(parsed.caption);

  // --- the hallucination check. The model must quote the caption; we verify
  //     the quote is really there. A made-up place can't produce real text.
  if (place.evidence) {
    if (caption.includes(norm(place.evidence))) t.add('evidence_verified', 3);
    else t.add('evidence_not_in_caption', -4);
  } else {
    t.add('no_evidence', 0);
  }

  // --- the name itself written in the caption
  if (place.name && norm(place.name).length >= 4 && caption.includes(norm(place.name))) {
    t.add('name_in_caption', 3);
  }

  // --- a handle that resolved to a real profile
  if (place.handle && resolvedNames[place.handle]) {
    const sim = nameSimilarity(place.name, resolvedNames[place.handle]);
    if (sim > 0.4) t.add('handle_resolved_matches', 3);
    else t.add('handle_resolved_only', 1);
  } else if (place.handle) {
    t.add('handle_unresolved', -1);
  }

  // --- a street address in the caption is about as good as it gets
  if (place.address) t.add('address_present', 3);

  // --- a region is a weaker save than a business: no place_id, no hours
  if (place.kind && place.kind !== 'venue') t.add(`kind_${place.kind}`, -1);

  return t.result;
}

/* ------------------------------------------------------------------ *
 * Phase 2 - after geocoding. The strongest signal, and free.
 *
 * Pass the raw results array from Places Text Search.
 * ------------------------------------------------------------------ */

export function refineWithGeocode(scored, place, geoResults = [], expectedCity = null) {
  const t = tally(scored.score, scored.why, scored.codes ?? []);

  if (!geoResults.length) {
    t.add('geocode_no_match', -5);
    return { ...t.result, geo: null };
  }

  const best = geoResults[0];
  const sim = nameSimilarity(place.name, best.name);

  if (sim > 0.7) t.add('geocode_name_match', 4);
  else if (sim > 0.4) t.add('geocode_name_partial', 1);
  else t.add('geocode_name_mismatch', -3);

  // one clear result beats a page of maybes
  if (geoResults.length === 1) {
    t.add('geocode_unique', 2);
  } else if (geoResults.length > 3 && nameSimilarity(best.name, geoResults[1]?.name) > 0.6) {
    // several near-identical hits: a chain, or the wrong branch
    t.add('geocode_ambiguous', -2);
  }

  // City is the weakest of these signals and it took two tries to admit it.
  // The model emits a REGIONAL label - "Banff", "Iceland", "Antigua" - while
  // Places returns a municipality: "Improvement District No. 9", "Reykjavík".
  // Both describe the same spot and no string comparison bridges them.
  //
  // So: check the locality and the full formatted address (checking only the
  // locality flagged "Reykjavík, Iceland" as not being in Iceland), award the
  // match, and make the mismatch nearly free. Agreement is real evidence;
  // disagreement is mostly this field being coarse. A real fix compares
  // coordinates against the region's bounding box, which costs another lookup.
  if (expectedCity) {
    const want = norm(expectedCity);
    const hay = `${norm(best.city)} ${norm(best.address)}`.trim();
    if (!hay) t.add('geocode_city_unknown', 0);
    else if (hay.includes(want) || (norm(best.city) && want.includes(norm(best.city)))) {
      t.add('geocode_city_match', 2);
    } else {
      t.add('geocode_city_weak', -1);
    }
  }

  return { ...t.result, geo: best };
}

/* ------------------------------------------------------------------ *
 * Turning codes into the line under the place name.
 *
 * The confirm card in the design reads "Matched from a tagged handle" - that
 * is this, not a debug string. Copy lives next to the codes so adding a signal
 * without giving it words is obvious.
 * ------------------------------------------------------------------ */

/** Strongest first. The first code a candidate has is the one shown. */
const EXPLANATIONS = [
  ['address_present',        'The caption gave a street address'],
  ['handle_resolved_matches','Matched from a tagged handle'],
  ['geocode_name_match',     'Named in the caption, found on the map'],
  ['name_in_caption',        'Named in the caption'],
  ['evidence_verified',      'Mentioned in the caption'],
  ['handle_resolved_only',   'From an account tagged in the post'],
  ['geocode_name_partial',   'Close match on the map'],
];

/** Shown instead when something is actually wrong - these win over the above. */
const WARNINGS = [
  ['geocode_no_match',       "Couldn't find this on the map"],
  ['evidence_not_in_caption','Not clearly mentioned in the caption'],
  ['geocode_name_mismatch',  'The map found something with a different name'],
  ['geocode_ambiguous',      'Several places share this name'],
  ['handle_unresolved',      "The tagged account didn't load"],
];

/**
 * One human sentence for a candidate, for the line under the name.
 *
 * @param {string[]} codes  the `codes` array off a scored candidate
 * @returns {{ text: string, tone: 'good' | 'warn' }}
 */
export function explain(codes = []) {
  const has = new Set(codes);
  for (const [code, text] of WARNINGS) if (has.has(code)) return { text, tone: 'warn' };
  for (const [code, text] of EXPLANATIONS) if (has.has(code)) return { text, tone: 'good' };
  return { text: 'Best guess from the caption', tone: 'warn' };
}

/* ------------------------------------------------------------------ *
 * Tiers. Thresholds are guesses - tune them against a labelled run, which is
 * possible now because the inputs are facts rather than model moods.
 * ------------------------------------------------------------------ */

/**
 * Thresholds. These were set against PRE-geocode scores, which topped out
 * around 12; with the geocode phase running the scale reaches 17 and the old
 * 9/4 split graded 61 of 70 candidates "high" - the confirm screen would have
 * auto-picked almost everything, which is the failure §5.8 exists to prevent.
 *
 * Re-cut against the 3 Sep run's distribution: roughly 40% single-tap,
 * 50% pick-from-three, 10% fall through to search.
 *
 * This is fitted to the SHAPE of the distribution, not to accuracy - nobody
 * has filled in `correct?` yet. Once a run is labelled, set these against the
 * rows where a high score was wrong and a low score was right. Until then they
 * are a better guess, not a measurement.
 */
export function tierOf(score) {
  if (score >= 13) return 'high';
  if (score >= 8) return 'medium';
  return 'low';
}

/**
 * Route the confirm screen on structure, not on a number the model made up.
 */
export function confirmationMode(candidates) {
  if (!candidates.length) return { mode: 'search', options: [] };

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const solid = sorted.filter(c => tierOf(c.score) !== 'low');

  // an itinerary reel names several real places - let the user pick which to save
  if (solid.length >= 3) return { mode: 'multi', options: solid.slice(0, 8) };

  const top = sorted[0];
  const gap = top.score - (sorted[1]?.score ?? 0);

  if (tierOf(top.score) === 'high' && gap >= 3) return { mode: 'single', options: [top] };
  if (tierOf(top.score) !== 'low') return { mode: 'choose', options: sorted.slice(0, 3) };
  return { mode: 'search', options: sorted.slice(0, 3) };
}
