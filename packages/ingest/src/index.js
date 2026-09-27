/**
 * @ruckus/ingest - reel URL -> ranked place candidates.
 *
 * This file owns the pipeline. The modules under it each do one thing and
 * do not know about each other:
 *
 *   instagram.js   fetch + parse og tags, decode entities, resolve handles
 *   extract-llm.js the model call, via the proxy            <- primary
 *   geocode.js     candidates -> real places with stable ids
 *   confidence.js  deterministic scoring + confirm routing
 *   ranker.js      heuristic fallback, offline only
 *
 * The layering is the point: instagram.js must never import a ranker, and
 * nothing below this file decides what the user sees. Steps 1-3 run on the
 * device (RN fetch goes through NSURLSession, so there is no CORS); only the
 * model call crosses to the proxy, because an API key in the binary is
 * extractable in minutes.
 *
 * See CLAUDE.md §5 before changing anything here.
 */

export {
  configure,
  currentPatterns,
  decodeEntities,
  fetchPage,
  shortcodeOf,
  parseReelPage,
  resolveHandle,
} from './instagram.js';

export { extractPlaces, SYSTEM, proxyHeaders } from './extract-llm.js';
export { geocodeCandidates, normaliseCity } from './geocode.js';
export { scoreCandidate, refineWithGeocode, tierOf, confirmationMode, explain } from './confidence.js';
export { rankCandidates } from './ranker.js';

import { fetchPage, shortcodeOf, parseReelPage, resolveHandle } from './instagram.js';
import { extractPlaces } from './extract-llm.js';
import { geocodeCandidates } from './geocode.js';
import { confirmationMode } from './confidence.js';

/** Never resolve more than this many handles - each one is a round trip. */
const MAX_HANDLES = 3;

/**
 * Full ingest for one reel.
 *
 * @param {string} url          the shared reel URL
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]  abort the whole pipeline
 * @param {string} [opts.accessToken]  the signed-in user's Supabase access token;
 *        the proxy refuses requests without one
 * @param {string} [opts.userCity]     hint for the heuristic fallback
 * @param {boolean} [opts.geocode=true] set false to stop before geocoding -
 *        only useful offline, since without it there is no placeId and so
 *        nothing that can actually be saved
 * @returns {Promise<object>}   parsed metadata + ResolvedPlace[] + confirm mode
 */
export async function extractFromReel(url, opts = {}) {
  const shortcode = shortcodeOf(url);
  if (!shortcode) throw new Error('Not an Instagram reel or post URL.');

  // Keep the path the user actually shared. Instagram serves the same page
  // under /p/ and /reel/, so fetching either works - but sourceUrl is what we
  // store and what pins deep-link to, and filing a photo carousel under
  // /reel/ is wrong even when it resolves.
  const path = /instagram\.com\/(?:p|tv)\//i.test(String(url)) ? 'p' : 'reel';
  const sourceUrl = `https://www.instagram.com/${path}/${shortcode}/`;
  const parsed = parseReelPage(await fetchPage(sourceUrl, opts));

  // Resolve every handle, not just the first - the venue is often the second,
  // and the first is the creator's collab account (CLAUDE.md §5.3).
  // In parallel: these are independent GETs, and three round trips in series
  // is most of the latency budget for a share extension that must feel instant.
  const handles = parsed.handles.slice(0, MAX_HANDLES);
  const names = await Promise.all(handles.map(h => resolveHandle(h, opts)));
  const resolvedNames = Object.fromEntries(handles.map((h, i) => [h, names[i]]));

  const ranked = await extractPlaces(parsed, resolvedNames, opts);

  // Geocoding is part of the pipeline, not an afterthought for the caller.
  // Without it a candidate has no googlePlaceId, no coordinate and no address,
  // which means it is not a ResolvedPlace and there is nothing to save. It is
  // also where most of the scoring signal lives (§5.7), so routing the confirm
  // screen on pre-geocode scores sends almost everything to 'medium'.
  const candidates = opts.geocode === false
    ? ranked.candidates
    : await geocodeCandidates(ranked.candidates, { city: ranked.city, sourceUrl }, opts);

  const confirm = confirmationMode(candidates);

  return {
    shortcode,
    sourceUrl,
    ...parsed,
    resolvedNames,
    city: ranked.city,
    candidates,                // ResolvedPlace[] unless geocode:false
    top: candidates[0] ?? null,
    confirmMode: confirm.mode,
    confirmOptions: confirm.options,
    engine: ranked.engine,     // 'model' | 'heuristic' - which path actually ran
    // true when the proxy refused because this user hit today's cap. Results
    // may still be present (the offline ranker ran), but they are worse, and
    // the app should say why rather than let them look like a bad guess.
    limited: Boolean(ranked.limited) ||
             candidates.some(c => c.geocodeError === 'daily_limit_reached'),
    notes: ranked.notes ?? null,
    extractedAt: new Date().toISOString(),
  };
}
