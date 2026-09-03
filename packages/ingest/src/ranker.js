/**
 * ranker.js - score every candidate venue instead of short-circuiting.
 *
 * Replaces classify() + buildQuery() in instagram.js.
 *
 * Why: on a 20-reel sample, taking the first handle got 2/9 wrong. Both
 * times the handle resolved to a PERSON (the creator's collab account,
 * a friend) while the real venue sat in the prose - "Ilinca Ducharme"
 * won over "📍 Thindi Café – 153 E Liberty St".
 *
 * So: gather candidates from all signals, score them, sort. A person
 * scores negative, an address scores high, and a name corroborated by a
 * hashtag scores higher than either alone.
 *
 *   import { rankCandidates } from './ranker';
 *   const ranked = rankCandidates(parsed, resolvedNames);
 *   // -> [{ name, score, source, evidence, geocodeQuery }, ...]
 */

/* ------------------------------------------------------------------ *
 * Vocabulary. Tune these against results.csv - they're the whole model.
 * ------------------------------------------------------------------ */

const VENUE_WORDS = [
  'cafe', 'café', 'coffee', 'espresso', 'roaster', 'roastery', 'bar',
  'restaurant', 'kitchen', 'bakery', 'bakehouse', 'patisserie', 'pastry',
  'bistro', 'eatery', 'tavern', 'pub', 'deli', 'grill', 'pizzeria',
  'pizza', 'ramen', 'sushi', 'izakaya', 'brewery', 'brewing', 'teahouse',
  'tea', 'creamery', 'gelato', 'dessert', 'diner', 'lounge', 'club',
  'market', 'grocer', 'shop', 'house', 'room', 'parlour', 'parlor',
  'trattoria', 'osteria', 'taqueria', 'cantina', 'bodega', 'brasserie',
];

// words that mean "this account is a person or a content creator"
const PERSON_WORDS = [
  'blogger', 'ugc', 'creator', 'influencer', 'lifestyle', 'photographer',
  'foodie', 'food & travel', 'travel', 'guide', 'reviews', 'reviewer',
  'explorer', 'adventures', 'diaries', 'journal', 'vlog', 'content',
];

// generic city/aggregator accounts - real, but never the venue itself
const AGGREGATOR_WORDS = [
  'things to do', 'thingstodo', 'best spots', 'bestspots', 'tourism',
  'top 10', 'hidden gems', 'streetsof', 'blogto', 'narcity', 'timeout',
];

// brands that get tagged as sponsors or tools, never as the destination
const SPONSOR_WORDS = [
  'skyscanner', 'booking.com', 'expedia', 'airbnb', 'tripadvisor', 'hostelworld',
  'getyourguide', 'viator', 'klook', 'agoda', 'kayak', 'hopper', 'omio',
  'revolut', 'wise', 'nordvpn', 'airalo', 'saily', 'gopro', 'dji',
];

// sentence glue - if a candidate contains these as words, it's prose, not a name
const STOPWORDS = new Set([
  'is','are','was','were','be','been','the','a','an','and','or','but','if',
  'with','from','that','this','these','those','you','your','we','our','they',
  'it','its','has','have','had','will','would','can','could','should','not',
  'for','to','of','in','on','at','by','so','as','just','really','very','all',
  'send','comment','share','save','follow','tag','check','click','link','dm',
]);

const STREET_SUFFIX =
  '(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Lane|Ln|Cres|Court|Ct|Pl|Place)';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const norm = s =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const hasAny = (s, words) => {
  const low = String(s || '').toLowerCase();
  return words.some(w => low.includes(w));
};

/**
 * A venue name is a name, not a clause. "The cozy cafe is filled with warm
 * Tibetan decor" contains sentence glue; "Himalayan Coffee House" doesn't.
 */
function isSentenceFragment(name) {
  const words = String(name || '').trim().split(/\s+/);
  if (words.length > 6) return true;
  const glue = words.filter(w =>
    STOPWORDS.has(w.toLowerCase().replace(/[^a-z]/g, ''))
  ).length;
  // one leading "The" is fine; two or more stopwords means it's prose
  return glue >= 2 || (glue === 1 && words.length > 4);
}

/**
 * "Toronto Cafe", "TorontoCafe", "Toronto Coffee" - a city plus a category
 * and nothing else. Never a real venue, and hashtags corroborate it
 * circularly (#torontocafe "confirms" the string "Toronto Cafe").
 */
function isGenericPlaceName(name, city) {
  const n = norm(name);
  if (!n) return true;
  let rest = n;
  if (city) rest = rest.replace(norm(city), '');
  for (const w of VENUE_WORDS) rest = rest.replace(norm(w), '');
  // nothing distinctive survived
  return rest.length < 3;
}

/** "Firstname Lastname" with no venue vocabulary - probably a human. */
function looksLikePersonName(name) {
  if (!name) return false;
  const clean = name.split('|')[0].split('(')[0].trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return false;
  if (hasAny(clean, VENUE_WORDS)) return false;
  return parts.every(p => /^[A-Z][a-z'’-]+$/.test(p));
}

/* ------------------------------------------------------------------ *
 * Candidate extraction from prose
 * ------------------------------------------------------------------ */

/** Cut at the first boundary that ends a name: sentence stop, comma, bracket. */
function trimName(raw) {
  let s = String(raw || '').trim();
  s = s.split(/(?:\.\s|\s[-\u2013\u2014]\s|,\s|\(|\||\n)/)[0];
  const words = s.trim().split(/\s+/);
  return words.slice(0, 6).join(' ');
}

function proseCandidates(prose) {
  if (!prose) return [];
  const out = [];
  const push = (name, evidence, weight) => {
    const n = (name || '').trim().replace(/[.,;:–—-]+$/, '').trim();
    if (n.length < 2 || n.length > 60) return;
    if (isSentenceFragment(n)) return;
    out.push({ name: n, evidence, weight });
  };

  // 📍 Venue Name – Neighbourhood | 153 E Liberty St
  // strongest single pattern in the sample
  // explicit code points only - writing the emoji literally pulls in
  // U+FE0F from 🗺️, and then ☕️ matches too. That was the bug.
  const pin = /[\u{1F4CD}\u{1F3E0}\u{1F5FA}]\s*([^|\n\u2013\u2014(]{2,60})/gu;
  for (const m of prose.matchAll(pin)) push(trimName(m[1]), 'pin_marker', 5);

  // an address implies the words immediately before it are the venue
  const addr = new RegExp(
    `([A-Z][\\w'’&.\\- ]{2,40}?)\\s*[–—|,-]?\\s*\\d{1,5}\\s+[A-Z][\\w.]*\\s+${STREET_SUFFIX}`,
    'g'
  );
  for (const m of prose.matchAll(addr)) push(m[1], 'address_adjacent', 4);

  // "at Kissa Tanto", "visited Bar Raval", "to Dineen Coffee"
  const verb =
    /\b(?:at|visited|tried|hit up|went to|from|inside)\s+([A-Z][\w'’&.\-]*(?:\s+[A-Z][\w'’&.\-]*){0,3})/g;
  for (const m of prose.matchAll(verb)) push(m[1], 'prose_verb', 2);

  // a capitalised run containing venue vocabulary: "Moraine Lake Café"
  const titled = /\b([A-Z][\w'’&.\-]*(?:\s+[A-Z&][\w'’&.\-]*){0,3})\b/g;
  for (const m of prose.matchAll(titled)) {
    if (hasAny(m[1], VENUE_WORDS)) push(m[1], 'venue_word_in_prose', 3);
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

function scoreCandidate(cand, ctx) {
  const { hashtags = [], author, prose = '' } = ctx;
  const reasons = [];
  let score = cand.weight || 0;
  reasons.push(`${cand.evidence} +${cand.weight || 0}`);

  const name = cand.name;

  // --- venue vocabulary is the single best positive signal
  if (hasAny(name, VENUE_WORDS)) {
    score += 3;
    reasons.push('venue_word +3');
  }

  // --- person and aggregator penalties
  if (hasAny(name, PERSON_WORDS)) {
    score -= 4;
    reasons.push('person_word -4');
  }
  if (hasAny(name, AGGREGATOR_WORDS)) {
    score -= 5;
    reasons.push('aggregator -5');
  }
  if (hasAny(name, SPONSOR_WORDS)) {
    score -= 8;
    reasons.push('sponsor_brand -8');
  }
  // a pin marker or an address is strong evidence this IS the venue, so
  // don't let name shape override it. "Dual Citizen" reads like a person.
  if (looksLikePersonName(name) &&
      cand.evidence !== 'pin_marker' && cand.evidence !== 'address_adjacent') {
    score -= 3;
    reasons.push('person_name_shape -3');
  }
  // "Roya (Masouda Baryole)✨Food I Travel" - creator bio formatting
  if (/[|(]/.test(name) && hasAny(name, PERSON_WORDS)) {
    score -= 2;
    reasons.push('creator_bio_format -2');
  }

  // --- cross-corroboration: the name also appears as a hashtag.
  // #ThindiCafe alongside "Thindi Café" is strong independent evidence.
  const nn = norm(name);
  if (ctx.city && isGenericPlaceName(name, ctx.city)) {
    score -= 8;
    reasons.push('generic_city_category -8');
  }
  if (nn.length >= 5 && !isGenericPlaceName(name, ctx.city) &&
      hashtags.some(t => norm(t).includes(nn))) {
    score += 4;
    reasons.push('hashtag_corroborated +4');
  }

  // --- a handle whose name also shows up in the prose
  if (cand.source === 'handle' && nn.length >= 4 && norm(prose).includes(nn)) {
    score += 2;
    reasons.push('handle_echoed_in_prose +2');
  }

  // --- never the poster's own account
  if (cand.handle && author && cand.handle === author) {
    score -= 10;
    reasons.push('is_author -10');
  }

  // --- unresolved handles are weaker than resolved ones
  if (cand.source === 'handle' && !cand.resolved) {
    score -= 1;
    reasons.push('unresolved_handle -1');
  }

  return { score, reasons };
}

/* ------------------------------------------------------------------ *
 * City
 * ------------------------------------------------------------------ */

function cityFromHashtags(hashtags = [], fallbackCity = null) {
  // strip common suffixes: torontocafe -> toronto, torontofoodie -> toronto
  const SUFFIX = /(cafe|café|cafes|coffee|eats|food|foodie|foodies|things?todo|lifestyle|blogger|dessert|drinks|restaurants?)$/;
  const counts = {};
  for (const t of hashtags) {
    const base = t.toLowerCase().replace(SUFFIX, '');
    if (base.length >= 4) counts[base] = (counts[base] || 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  // only trust it if the stem showed up more than once
  return best && best[1] > 1
    ? best[0].charAt(0).toUpperCase() + best[0].slice(1)
    : fallbackCity;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

/**
 * @param parsed         output of parseReelPage()
 * @param resolvedNames  { handle: displayName|null } from resolveHandle()
 * @param opts.userCity  fall back to the user's current city
 */
export function rankCandidates(parsed, resolvedNames = {}, opts = {}) {
  const { prose = '', handles = [], hashtags = [], author } = parsed;

  const candidates = [];

  // every handle is a candidate, not just handles[0]
  for (const h of handles) {
    const resolved = resolvedNames[h] || null;
    candidates.push({
      name: resolved || h,
      handle: h,
      resolved: Boolean(resolved),
      source: 'handle',
      evidence: resolved ? 'handle_resolved' : 'handle_raw',
      weight: resolved ? 4 : 2,
    });
  }

  for (const c of proseCandidates(prose)) {
    candidates.push({ ...c, source: 'prose' });
  }

  // dedupe by normalised name, keeping the highest base weight
  const byName = new Map();
  for (const c of candidates) {
    const k = norm(c.name);
    if (!k) continue;
    const prev = byName.get(k);
    if (!prev || (c.weight || 0) > (prev.weight || 0)) byName.set(k, c);
  }

  const city = cityFromHashtags(hashtags, opts.userCity);

  const scored = [...byName.values()]
    .map(c => {
      const { score, reasons } = scoreCandidate(c, { hashtags, author, prose, city });
      const needsCity =
        city && !c.name.toLowerCase().includes(city.toLowerCase());
      return {
        name: c.name,
        handle: c.handle || null,
        source: c.source,
        evidence: c.evidence,
        score,
        reasons,                                  // keep for tuning
        geocodeQuery: needsCity ? `${c.name} ${city}` : c.name,
      };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return { city, candidates: scored };
}

/* ------------------------------------------------------------------ *
 * Confirmation UI shape - §5.7 says adapt to confidence.
 * ------------------------------------------------------------------ */

export function confirmationMode(ranked) {
  const c = ranked.candidates;
  if (!c.length) return { mode: 'search', options: [] };

  const top = c[0];
  const gap = top.score - (c[1]?.score ?? 0);

  // clear winner, well ahead of the field -> one result + "not right?"
  if (top.score >= 7 && gap >= 3) {
    return { mode: 'single', options: [top] };
  }
  // several plausible -> let the user recognise rather than recall
  if (top.score >= 3) {
    return { mode: 'choose', options: c.slice(0, 3) };
  }
  return { mode: 'search', options: c.slice(0, 3) };
}

/* ------------------------------------------------------------------ *
 * Multi-place reels (the Banff row) return several strong candidates.
 * Don't collapse those to one - offer them all as separate saves.
 * ------------------------------------------------------------------ */

export function isMultiPlace(ranked) {
  return ranked.candidates.filter(c => c.score >= 7).length >= 3;
}
