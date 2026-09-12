/**
 * instagram.js - reel URL -> structured metadata, on device.
 *
 * No CORS in React Native (fetch goes through NSURLSession), so this
 * works directly from the app. No server, no proxy, no API key.
 *
 *   import { parseReelPage, resolveHandle } from './instagram.js';
 *
 * Fetch and parse only. Which candidate is the venue is decided a layer up,
 * in index.js - this file must never import the ranker.
 *
 * Verified 30 Aug 2026: logged out, Instagram serves og:title,
 * og:description and og:image only. No video, no comments, no post JSON.
 */

const UA = 'Mozilla/5.0 (compatible; facebookexternalhit/1.1)';

/* ------------------------------------------------------------------ *
 * REMOTE CONFIG CANDIDATES
 * These two break when Instagram changes their format. Ship them from
 * your server so you can fix them without an App Store release.
 * ------------------------------------------------------------------ */
const DEFAULTS = {
  wrapper:
    /^(?:([\d,.]+[KMkm]?)\s+likes?,\s*([\d,.]+[KMkm]?)\s+comments?\s*-\s*)?(\S+)\s+on\s+(.+?):\s*"([\s\S]*)"\.?\s*$/,
  profileName: /from\s+([\s\S]+?)\s*\(@/,
};

// Mutable so the server can correct them mid-flight. Never reassign the
// object - callers hold no reference to it, but the pattern getters below do.
let patterns = { ...DEFAULTS };

/**
 * Replace the two fragile regexes at runtime.
 *
 * These break when Instagram changes the format of og:description, and that
 * change arrives without warning. Shipping them as config means a fix is a
 * server deploy, not an App Store review - which is days versus a week or more,
 * during which the app cannot read a single reel.
 *
 * Patterns arrive as strings because they come over the wire as JSON. An
 * invalid pattern is ignored rather than thrown: a bad remote config must
 * degrade to the built-in behaviour, never brick the app.
 *
 *   configure({ wrapper: '^(?:...)$' })   // usually from GET /config
 *   configure(null)                       // back to the built-ins
 *
 * @returns {string[]} the keys that were actually applied
 */
export function configure(next) {
  if (!next) { patterns = { ...DEFAULTS }; return []; }
  const applied = [];
  for (const key of ['wrapper', 'profileName']) {
    const v = next[key];
    if (typeof v !== 'string' || !v) continue;
    try {
      patterns[key] = new RegExp(v);
      applied.push(key);
    } catch {
      // keep whatever was working; a broken regex from the server is a
      // deploy mistake and must not take the client down with it
    }
  }
  return applied;
}

/** What the parser is currently using, for a debug screen or a bug report. */
export function currentPatterns() {
  return { wrapper: String(patterns.wrapper), profileName: String(patterns.profileName) };
}

/* ------------------------------------------------------------------ *
 * HTML entities - RN has no DOM, so no textarea trick. Hand-rolled.
 * Captions arrive as &#064; for @ and &#x2615;&#xfe0f; for emoji.
 * Skip this and your handle regex silently matches nothing.
 * ------------------------------------------------------------------ */
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', rsquo: '\u2019',
};

export function decodeEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

function cp(n) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */

/**
 * A reel page is ~660KB, but every og tag we want sits in the first ~14KB -
 * measured at 1.9% in. Instagram ignores a Range header (returns 200 and the
 * whole body), so the only way to not pay for the rest is to read the stream
 * and cancel once the tags are in hand. Measured: 660KB -> 14KB, 335ms -> 116ms,
 * and there are up to four of these fetches per save.
 *
 * res.body is not guaranteed: React Native's default fetch is XHR-backed and
 * exposes no ReadableStream (expo/fetch does). Fall back to res.text() rather
 * than depending on it - correctness first, the saving is an optimisation.
 */
const HEAD_CAP = 64 * 1024;

export async function fetchPage(url, opts = {}) {
  // signal is threaded all the way down so the share extension can abort the
  // whole pipeline when the user dismisses it mid-fetch.
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: opts.signal });
  if (!res.ok) throw new Error(`instagram returned ${res.status}`);

  if (opts.fullBody || typeof res.body?.getReader !== 'function') return res.text();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let read = 0;
  try {
    while (read < HEAD_CAP) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.length;
      buf += decoder.decode(value, { stream: true });
      // both tags present means the whole <head> block we care about landed
      if (buf.includes('og:image') && buf.includes('og:description')) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return buf;
}

function og(page, prop) {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );
  const m = page.match(re);
  return m ? decodeEntities(m[1]) : '';
}

export function shortcodeOf(url) {
  const m = String(url).match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/i);
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ *
 * Parse the three tags we actually get.
 * ------------------------------------------------------------------ */
export function parseReelPage(page) {
  const desc = og(page, 'og:description');
  const title = og(page, 'og:title');

  let author = null, postedAt = null, caption = desc;
  const m = desc.match(patterns.wrapper);
  if (m) {
    author = m[3];
    postedAt = m[4];
    caption = m[5];
  }
  // non-fatal: a changed wrapper still leaves usable text. Log it -
  // wrapperOk === false in production is your signal to push new config.

  const creator = title.includes(' on Instagram')
    ? title.split(' on Instagram')[0].trim()
    : '';

  const handles = [...new Set(
    [...caption.matchAll(/@([A-Za-z0-9._]{2,30})/g)].map(x => x[1])
  )].filter(h => h !== author);

  const hashtags = [...new Set(
    [...caption.matchAll(/#([^\s#]+)/g)].map(x => x[1])
  )];

  // strip hashtags and the ". . . ." padding creators use to hide them
  const prose = caption
    .replace(/#[^\s#]+/g, '')
    .replace(/(\s*\.\s*){2,}/g, ' ')
    .trim();

  return {
    wrapperOk: Boolean(m),
    creator,
    author,
    postedAt,
    caption,
    prose,
    handles,
    hashtags,
    coverUrl: og(page, 'og:image'),
  };
}

/* ------------------------------------------------------------------ *
 * Handle resolution - the primary signal. Creators tag the venue
 * instead of typing it. One extra fetch turns @dualcitizentoronto
 * into "Dual Citizen | Coffee Bar".
 * ------------------------------------------------------------------ */
export async function resolveHandle(handle, opts = {}) {
  try {
    const page = await fetchPage(`https://www.instagram.com/${handle}/`, opts);
    const desc = og(page, 'og:description');
    const m = desc.match(patterns.profileName);
    return m ? m[1].trim() : null;
  } catch {
    return null; // not fatal - fall through to the handle string itself
  }
}
