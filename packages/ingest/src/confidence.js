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
 * Every input is checkable, so every score is explainable. `why` is on the
 * output for exactly that reason - when a routing decision looks wrong, read it.
 */

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** crude token overlap, enough to tell "Thindi Café" from "Thai Basil" */
function nameSimilarity(a, b) {
  const A = new Set(norm(a).match(/.{1,3}/g) || []);
  const B = new Set(norm(b).match(/.{1,3}/g) || []);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const x of A) if (B.has(x)) hit++;
  return hit / Math.max(A.size, B.size);
}

/* ------------------------------------------------------------------ *
 * Phase 1 - before geocoding
 * ------------------------------------------------------------------ */

export function scoreCandidate(place, parsed, resolvedNames = {}) {
  const why = [];
  let score = 0;
  const caption = norm(parsed.caption);

  // --- the hallucination check. The model must quote the caption; we verify
  //     the quote is really there. A made-up place can't produce real text.
  if (place.evidence) {
    if (caption.includes(norm(place.evidence))) {
      score += 3;
      why.push('evidence_verified +3');
    } else {
      score -= 4;
      why.push('evidence_not_in_caption -4');
    }
  } else {
    why.push('no_evidence 0');
  }

  // --- the name itself written in the caption
  if (place.name && norm(place.name).length >= 4 && caption.includes(norm(place.name))) {
    score += 3;
    why.push('name_in_caption +3');
  }

  // --- a handle that resolved to a real profile
  if (place.handle && resolvedNames[place.handle]) {
    const sim = nameSimilarity(place.name, resolvedNames[place.handle]);
    if (sim > 0.4) {
      score += 3;
      why.push('handle_resolved_matches +3');
    } else {
      score += 1;
      why.push('handle_resolved_only +1');
    }
  } else if (place.handle) {
    score -= 1;
    why.push('handle_unresolved -1');
  }

  // --- a street address in the caption is about as good as it gets
  if (place.address) {
    score += 3;
    why.push('address_present +3');
  }

  // --- a region is a weaker save than a business: no place_id, no hours
  if (place.kind && place.kind !== 'venue') {
    score -= 1;
    why.push(`kind_${place.kind} -1`);
  }

  return { score, why };
}

/* ------------------------------------------------------------------ *
 * Phase 2 - after geocoding. The strongest signal, and free.
 *
 * Pass the raw results array from MKLocalSearch / Places Text Search.
 * ------------------------------------------------------------------ */

export function refineWithGeocode(scored, place, geoResults = [], expectedCity = null) {
  const why = [...scored.why];
  let score = scored.score;

  if (!geoResults.length) {
    return { score: score - 5, why: [...why, 'geocode_no_match -5'], geo: null };
  }

  const best = geoResults[0];
  const sim = nameSimilarity(place.name, best.name);

  if (sim > 0.7) {
    score += 4;
    why.push('geocode_name_match +4');
  } else if (sim > 0.4) {
    score += 1;
    why.push('geocode_name_partial +1');
  } else {
    score -= 3;
    why.push('geocode_name_mismatch -3');
  }

  // one clear result beats a page of maybes
  if (geoResults.length === 1) {
    score += 2;
    why.push('geocode_unique +2');
  } else if (geoResults.length > 3 && nameSimilarity(best.name, geoResults[1]?.name) > 0.6) {
    // several near-identical hits: a chain, or the wrong branch
    score -= 2;
    why.push('geocode_ambiguous -2');
  }

  if (expectedCity && best.address) {
    if (norm(best.address).includes(norm(expectedCity))) {
      score += 2;
      why.push('geocode_city_match +2');
    } else {
      score -= 3;
      why.push('geocode_city_mismatch -3');
    }
  }

  return { score, why, geo: best };
}

/* ------------------------------------------------------------------ *
 * Tiers. Thresholds are guesses - tune them against results.csv, which is
 * possible now because the inputs are facts rather than model moods.
 * ------------------------------------------------------------------ */

export function tierOf(score) {
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
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
