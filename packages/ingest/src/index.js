/**
 * @ruckus/ingest - reel URL -> ranked place candidates.
 *
 * This file owns the pipeline. The modules under it each do one thing and
 * do not know about each other:
 *
 *   instagram.js   fetch + parse og tags, decode entities, resolve handles
 *   extract-llm.js the model call, via the proxy            <- primary
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
  decodeEntities,
  fetchPage,
  shortcodeOf,
  parseReelPage,
  resolveHandle,
} from './instagram.js';

export { extractPlaces } from './extract-llm.js';
export { scoreCandidate, refineWithGeocode, tierOf, confirmationMode } from './confidence.js';
export { rankCandidates } from './ranker.js';

import { fetchPage, shortcodeOf, parseReelPage, resolveHandle } from './instagram.js';
import { extractPlaces } from './extract-llm.js';
import { confirmationMode } from './confidence.js';

/** Never resolve more than this many handles - each one is a round trip. */
const MAX_HANDLES = 3;

/**
 * Full ingest for one reel.
 *
 * @param {string} url          the shared reel URL
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]  abort the whole pipeline
 * @param {string} [opts.userCity]     hint for the heuristic fallback
 * @returns {Promise<object>}   parsed metadata + scored candidates + confirm mode
 */
export async function extractFromReel(url, opts = {}) {
  const shortcode = shortcodeOf(url);
  if (!shortcode) throw new Error('Not an Instagram reel or post URL.');

  const sourceUrl = `https://www.instagram.com/reel/${shortcode}/`;
  const parsed = parseReelPage(await fetchPage(sourceUrl, opts));

  // Resolve every handle, not just the first - the venue is often the second,
  // and the first is the creator's collab account (CLAUDE.md §5.3).
  // In parallel: these are independent GETs, and three round trips in series
  // is most of the latency budget for a share extension that must feel instant.
  const handles = parsed.handles.slice(0, MAX_HANDLES);
  const names = await Promise.all(handles.map(h => resolveHandle(h, opts)));
  const resolvedNames = Object.fromEntries(handles.map((h, i) => [h, names[i]]));

  const ranked = await extractPlaces(parsed, resolvedNames, opts);
  const confirm = confirmationMode(ranked.candidates);

  return {
    shortcode,
    sourceUrl,
    ...parsed,
    resolvedNames,
    city: ranked.city,
    candidates: ranked.candidates,
    top: ranked.candidates[0] ?? null,
    geocodeQuery: ranked.candidates[0]?.geocodeQuery ?? null,
    confirmMode: confirm.mode,
    confirmOptions: confirm.options,
    engine: ranked.engine,     // 'model' | 'heuristic' - which path actually ran
    notes: ranked.notes ?? null,
    extractedAt: new Date().toISOString(),
  };
}
