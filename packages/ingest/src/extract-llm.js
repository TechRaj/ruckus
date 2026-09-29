/**
 * extract-llm.js - model-based candidate extraction.
 *
 * Replaces the hand-tuned vocabulary in ranker.js. Those lists were fitted
 * to 20 Toronto cafes and broke immediately on travel reels: no Skyscanner
 * in SPONSOR_WORDS, no "Tea House" in VENUE_WORDS, "Dual Citizen" flagged
 * as a person. Every fix was a new hardcode. Reels are too varied for that.
 *
 * Split of labour:
 *   deterministic  - fetch og tags, decode entities, resolve handles, geocode
 *   model          - which candidate is the venue, is a handle a business or
 *                    a person or a sponsor, is this a place or a region,
 *                    how many places does the reel name
 *
 * ranker.js stays as the offline fallback. Don't delete it.
 */

import { rankCandidates as heuristicRank } from './ranker.js';
import { scoreCandidate, tierOf, explain } from './confidence.js';

export { confirmationMode, refineWithGeocode, explain } from './confidence.js';

// Your proxy, not api.anthropic.com - an API key in the binary is extractable.
//
// Read at call time, never at module load. ESM imports are hoisted above the
// importing file's own statements, so a caller that sets EXTRACT_ENDPOINT at
// the top of its file still loses the race - this module is already evaluated.
// That failure is silent and expensive: the fetch hits the placeholder host,
// throws, and extractPlaces() quietly returns heuristic results that look
// plausible. It cost a whole 14-URL run on 12 Sept.
/**
 * Who is calling the proxy. The app passes the signed-in user's Supabase
 * access token (`opts.accessToken`); our own tooling sets PROXY_SECRET. The
 * proxy refuses anything with neither.
 */
export function proxyHeaders(opts = {}) {
  if (opts.accessToken) return { Authorization: `Bearer ${opts.accessToken}` };
  const secret = typeof process !== 'undefined' ? process.env?.PROXY_SECRET : undefined;
  return secret ? { 'x-ruckus-key': secret } : {};
}

/**
 * A non-2xx from the proxy, carrying its stable error key (e.g.
 * `daily_limit_reached`) as `.code` so callers can react to it rather than
 * parse a message.
 */
export async function proxyError(route, res) {
  let code = null;
  try { code = (await res.json())?.error ?? null; } catch { /* not JSON */ }
  const err = new Error(`${route} proxy ${res.status}${code ? ` ${code}` : ''}`);
  err.code = code;
  err.status = res.status;
  return err;
}

export const extractEndpoint = () =>
  (typeof process !== 'undefined' ? process.env?.EXTRACT_ENDPOINT : undefined) ?? null;

// Exported for the proxy, which is the only thing that sends it. The client
// used to send this with every request and the proxy trusted it - so anyone
// who reached the proxy could swap in their own instructions and use the
// OpenRouter key as a free chatbot. Now the prompt lives server-side.
export const SYSTEM = `You identify places from Instagram Reel metadata for a saved-places app.

You get a caption, the creator's handle, any @handles tagged in it with their
resolved profile names, and the hashtags. You never see the video.

Return ONLY a JSON object. No prose, no markdown fences.

{
  "city": "best guess at the city or region, else null",
  "places": [
    {
      "name": "the place as a user would search for it",
      "kind": "venue | region | event | trail | accommodation",
      "instagram_handle": "handle without @, or null",
      "category": "short descriptor, e.g. 'specialty coffee', 'ramen'",
      "address": "street address if stated, else null",
      "evidence": "the exact substring of the caption this came from — copy it verbatim, do not paraphrase",
      "geocode_query": "what to send to a places API, usually name + city",
      "when": {
        "text": "the date phrase exactly as the caption writes it, else null",
        "start": "YYYY-MM-DD, else null",
        "end": "YYYY-MM-DD for a range, else null",
        "recurring": "e.g. 'Wednesday nights', else null"
      }
    }
  ],
  "notes": "one sentence on anything ambiguous, or null"
}

How to judge:

- A tagged @handle is often the venue, but frequently is NOT. It may be the
  creator's second account, a friend, a photographer, a collab partner, or a
  paid sponsor (booking sites, VPNs, eSIMs, luggage, cameras). Use the
  resolved profile name to tell them apart. A sponsor is never a place.

- Prefer a name the user could actually search. Skip generic strings built
  from a city plus a category ("Toronto Cafe") - those come from hashtags,
  not from a real venue name.

- Never return a sentence fragment. "The cozy cafe is filled with warm decor"
  describes a place; it is not its name. If the caption never names the place,
  return an empty places array rather than guessing.

- A festival programme is not a place. Event reels name strands, showcases and
  series - "Midnight Madness", "Festival Street", "After Hours" - which read
  like proper nouns but are things that happen, not somewhere to go. Return the
  VENUE that hosts them if the caption names one, and otherwise return nothing
  for that strand. The same applies to an event's own name: "Water Lantern
  Festival" is an event, and the place to save is the park it runs in.

- Travel reels often name several places, and some are regions rather than
  businesses (a lake, a park, a neighbourhood). Return them all, each tagged
  with the right "kind". Do not collapse an itinerary into one entry.

- Return at most 8 places, ordered by how central they are to the reel. An
  itinerary naming 27 stops should return the 8 the reel actually dwells on.

- "kind" must be exactly one of: venue, region, event, trail, accommodation.
  A named business is a venue even when it sits inside a park. A lake, town,
  park or neighbourhood is a region. Do not invent other values.

- "evidence" is mandatory and must be copied verbatim from the caption. It is
  checked against the caption downstream, so a paraphrase reads as a
  hallucination and the candidate is discarded. If you cannot quote the
  caption for a place, do not return that place.

- Fill "when" whenever the caption gives a date, a range or a recurrence, even
  loosely. Copy the phrase verbatim into "text". Resolve "start"/"end" against
  POSTED, which is when the caption was written - "August 11" on a post from
  September 2026 means 2026-08-11, and a bare month means the next occurrence.
  Leave "start" null rather than guessing a year you cannot infer. A place with
  no date gets "when": null - most saves have no date and that is fine.

- Do not rate your own certainty. Confidence is computed downstream from
  facts that can be checked.

- Never invent coordinates, ratings, or opening hours.`;

function buildUserMessage(parsed, resolvedNames = {}) {
  const lines = [];
  lines.push(`CAPTION:\n${parsed.caption || '(empty)'}`);
  if (parsed.creator) lines.push(`\nPOSTED BY: ${parsed.creator} (@${parsed.author ?? '?'})`);
  // the model needs this to turn "August 11" into a real date
  if (parsed.postedAt) lines.push(`\nPOSTED: ${parsed.postedAt}`);

  const tagged = (parsed.handles || []).map(h => {
    const r = resolvedNames[h];
    return r ? `@${h} -> "${r}"` : `@${h} (unresolved)`;
  });
  if (tagged.length) lines.push(`\nTAGGED HANDLES:\n${tagged.join('\n')}`);
  if (parsed.hashtags?.length) lines.push(`\nHASHTAGS: ${parsed.hashtags.map(t => '#' + t).join(' ')}`);

  return lines.join('\n');
}

function parseJson(raw) {
  let s = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

/**
 * Normalise the model output into the shape the confirm screen already
 * consumes, so this is a drop-in swap for rankCandidates().
 */
/**
 * An event is a place plus a when, and until now the when was dropped on the
 * floor: every reel in the 12 Sept holdout carried a date in the caption
 * ("Sept 10-20", "Wednesday nights", "August 11") and none of it survived.
 *
 * Kept deliberately loose. `text` is what the caption said and is always safe
 * to show; `start`/`end` are only set when the model could resolve a real
 * date, and a calendar entry needs those. Never fabricate a year here - the
 * model has POSTED for that and a wrong date is worse than no date.
 */
function normaliseWhen(w) {
  if (!w || typeof w !== 'object') return null;
  const iso = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const text = typeof w.text === 'string' && w.text.trim() ? w.text.trim() : null;
  const recurring = typeof w.recurring === 'string' && w.recurring.trim() ? w.recurring.trim() : null;
  const start = iso(w.start), end = iso(w.end);
  if (!text && !start && !recurring) return null;
  return { text, start, end: end && start && end >= start ? end : null, recurring };
}

function toCandidates(result, parsed, resolvedNames) {
  return (result.places || [])
    .map(p => {
      const { score, why, codes } = scoreCandidate(p, parsed, resolvedNames);
      return {
        name: p.name,
        handle: p.instagram_handle ?? null,
        source: p.instagram_handle ? 'handle' : 'prose',
        evidence: p.evidence ?? null,
        kind: p.kind ?? 'venue',
        category: p.category ?? null,
        address: p.address ?? null,
        score,                      // deterministic, pre-geocode
        tier: tierOf(score),
        reasons: why,               // debug strings
        codes,                      // the same signals, structured
        // the line under the name on the confirm card. Recompute after
        // geocoding - the geocode signals change what it should say.
        explanation: explain(codes),
        geocodeQuery: p.geocode_query || p.name,
        when: normaliseWhen(p.when),
      };
    })
    .filter(c => c.name)
    .sort((a, b) => b.score - a.score);
}

/**
 * @param parsed        parseReelPage() output
 * @param resolvedNames { handle: displayName|null }
 * @param opts.signal   AbortSignal - keep the share extension responsive
 */
export async function extractPlaces(parsed, resolvedNames = {}, opts = {}) {
  try {
    const res = await fetch(opts.endpoint ?? extractEndpoint(), {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json', ...proxyHeaders(opts) },
      body: JSON.stringify({ message: buildUserMessage(parsed, resolvedNames) }),
    });
    if (!res.ok) throw await proxyError('extract', res);

    // model + cost come back from the proxy so a multi-model comparison run
    // can tell which model actually answered and what it spent.
    const { text, model, cost } = await res.json();
    const result = parseJson(text);

    return {
      city: result.city ?? null,
      candidates: toCandidates(result, parsed, resolvedNames),
      notes: result.notes ?? null,
      engine: 'model',
      model: model ?? null,
      cost: cost ?? null,
    };
  } catch (err) {
    // offline, rate-limited, proxy down, or malformed JSON.
    // The heuristic ranker is worse but it is not nothing.
    const fallback = heuristicRank(parsed, resolvedNames, opts);
    return { ...fallback, notes: null, engine: 'heuristic', model: null, cost: null,
             error: String(err.message),
             // the fallback still runs, but the app should say why results got worse
             limited: err.code === 'daily_limit_reached' };
  }
}
