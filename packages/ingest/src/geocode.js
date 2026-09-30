/**
 * geocode.js - candidates -> real places with stable ids.
 *
 * This is phase 2 of scoring and it is where most of the signal lives (§5.7).
 * It runs through the proxy, not directly: the Places key is as extractable
 * from an app binary as the model key is.
 *
 * Lives in ingest rather than in the app because the query construction and
 * the city handling are both load-bearing and both got fixed here on 3 Sept
 * after a run over 70 candidates. Putting them in a screen would lose them.
 */

import { refineWithGeocode, tierOf, explain } from './confidence.js';
import { proxyHeaders, proxyError } from './extract-llm.js';

// Call time, not module load - see the note in extract-llm.js.
export const geocodeEndpoint = () =>
  (typeof process !== 'undefined' ? process.env?.GEOCODE_ENDPOINT : undefined) ?? null;

/**
 * The model's `city` is inconsistent (§6): "Banff", "Banff National Park,
 * Alberta", "Normandy, France", null. Text Search wants a plain locality -
 * the province and the words "National Park" only give it something louder
 * than the venue name to match on.
 */
export function normaliseCity(city) {
  if (!city) return null;
  return city.split(',')[0].replace(/\b(national park|province|state|region)\b/gi, '').trim() || null;
}

/**
 * Appending the city helps a venue ("Dual Citizen" + "Toronto") and actively
 * breaks a region: measured 3 Sept, "Lake Louise" + "Banff" returned Banff
 * National Park, and "Percé" + "Gaspé" returned Gaspé. Regions and trails
 * carry their own unique names and do not want the suffix.
 */
const wantsCitySuffix = kind => kind === 'venue' || kind === 'accommodation';

async function lookup(query, city, opts) {
  const res = await fetch(opts.geocodeEndpoint ?? geocodeEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...proxyHeaders(opts) },
    signal: opts.signal,
    body: JSON.stringify({ query, city }),
  });
  if (!res.ok) throw await proxyError('geocode', res);
  return (await res.json()).results ?? [];
}

/**
 * Geocode every candidate and re-score it. Returns ResolvedPlace-shaped
 * objects - the contract in CLAUDE.md §9 that the app builds against.
 *
 * Candidates that fail to geocode are kept, not dropped: a failed lookup is
 * a -5 and a 'low' tier, which routes the user to search rather than showing
 * them nothing. Losing the candidate loses the name the model found.
 *
 * @param {object[]} candidates  from extractPlaces()
 * @param {object}   ctx         { city, sourceUrl }
 * @param {object}   [opts]      { signal, endpoint, concurrency }
 */
export async function geocodeCandidates(candidates, ctx = {}, opts = {}) {
  const city = normaliseCity(ctx.city);

  // Bounded parallelism: a share extension should not fire 8 requests at once
  // on a phone network, and should not do them one at a time either.
  const limit = opts.concurrency ?? 3;
  const out = new Array(candidates.length);
  let next = 0;

  await Promise.all(Array.from({ length: Math.min(limit, candidates.length) }, async () => {
    while (next < candidates.length) {
      const i = next++;
      const c = candidates[i];
      let results = [];
      let error = null;
      try {
        results = await lookup(c.geocodeQuery || c.name, wantsCitySuffix(c.kind) ? city : null, opts);
      } catch (err) {
        error = err.code ?? err.message;   // 'daily_limit_reached' stays matchable
      }

      const refined = refineWithGeocode(
        { score: c.score, why: c.reasons ?? [], codes: c.codes ?? [] },
        c, results, city
      );
      const geo = refined.geo;

      out[i] = {
        // --- ResolvedPlace, §9
        googlePlaceId: geo?.placeId ?? null,
        name: geo?.name || c.name,
        coordinate: geo ? { lat: geo.lat, lng: geo.lng } : null,
        address: geo?.address ?? null,
        neighbourhood: geo?.neighbourhood ?? null,
        city: geo?.city ?? city,
        kind: c.kind,
        category: c.category ?? null,
        when: c.when ?? null,     // an event is a place plus a when
        headline: c.headline ?? null,
        sourceUrl: ctx.sourceUrl ?? null,
        score: refined.score,
        tier: tierOf(refined.score),
        reasons: refined.why,
        // --- extra, useful, not part of the frozen contract
        codes: refined.codes,
        explanation: explain(refined.codes),
        modelName: c.name,        // what the model called it, before Google renamed it
        handle: c.handle ?? null,
        geocodeError: error,
      };
    }
  }));

  return dedupeByPlace(out).sort((a, b) => b.score - a.score);
}

/**
 * Returns every place Text Search finds for a typed query, in Google's order.
 * geocodeCandidates() returns only the single best match per candidate. The
 * user picks from these results, so none are scored and every tier is 'high'.
 * Makes one request. The proxy returns up to five places.
 *
 * @param {string} query
 * @param {object} [ctx]   { city }, appended to the query as for a venue
 * @param {object} [opts]  { signal, geocodeEndpoint, accessToken }
 * @returns {Promise<object[]>} ResolvedPlace objects (CLAUDE.md §9)
 */
export async function searchPlaces(query, ctx = {}, opts = {}) {
  const q = (query ?? '').trim();
  if (!q) return [];
  const results = await lookup(q, normaliseCity(ctx.city), opts);

  return dedupeByPlace(results
    .filter(r => r.placeId && r.lat != null && r.lng != null)
    .map(r => ({
      googlePlaceId: r.placeId,
      name: r.name || q,
      coordinate: { lat: r.lat, lng: r.lng },
      address: r.address || null,
      neighbourhood: r.neighbourhood ?? null,
      city: r.city ?? null,
      kind: 'venue',
      // Google's first specific type, such as "cafe". The app maps it to eat, drink or do.
      category: (r.types ?? []).find(t => t !== 'point_of_interest' && t !== 'establishment')?.replace(/_/g, ' ') ?? null,
      when: null,
      headline: null,
      sourceUrl: null,
      score: 0,
      tier: 'high',
      reasons: ['found by search'],
      codes: ['searched_by_name'],
      explanation: { text: 'Found by search', tone: 'good' },
      modelName: q,
      handle: null,
      geocodeError: null,
    })));
}

/**
 * Collapse candidates that resolved to the same real place.
 *
 * Event reels make the model emit one location twice - once as the venue and
 * once as the event held there: Sankofa Square came back as venue 17 and event
 * 7, College Park as venue 15 and event 14. Both geocode to the same
 * place_id, so without this the confirm screen offers the same pin twice and
 * the user can save it twice. It was 11% of rows on the 12 Sept holdout.
 *
 * Keep the higher-scoring row, but remember that the reel also described it as
 * an event - that is a real fact about the save and the thing a date would
 * eventually hang off.
 */
function dedupeByPlace(places) {
  const byId = new Map();
  const noId = [];

  for (const p of places) {
    if (!p.googlePlaceId) { noId.push(p); continue; }   // nothing to dedupe on
    const seen = byId.get(p.googlePlaceId);
    if (!seen) { byId.set(p.googlePlaceId, p); continue; }

    const [keep, drop] = seen.score >= p.score ? [seen, p] : [p, seen];
    keep.alsoSeenAs = [...new Set([...(keep.alsoSeenAs ?? []), ...(drop.alsoSeenAs ?? []), drop.kind])]
      .filter(k => k !== keep.kind);
    // the venue row usually outscores the event row, and the event row is the
    // one carrying the date - losing it here would undo the whole point
    keep.when = keep.when ?? drop.when;
    // and the event row's name is the reason to go: "CHANEL cafe pop-up" at
    // Dineen Coffee Co. Dropping it left a plain coffee shop on the map.
    keep.headline = keep.headline ?? drop.headline ??
      (drop.kind === 'event' && drop.modelName !== keep.modelName ? drop.modelName : null);
    byId.set(p.googlePlaceId, keep);
  }

  return [...byId.values(), ...noId];
}
