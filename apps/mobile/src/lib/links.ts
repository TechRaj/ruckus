import { Linking } from 'react-native';
/**
 * Links that arrive from other apps: finding them, and cleaning them before
 * they're saved.
 */

/**
 * The first web link in whatever another app shared - some send a URL, some a
 * caption with the URL in it, some both. expo-share-intent already pulls a
 * `webUrl` out; this is the same job applied to both fields, plus trimming the
 * sentence punctuation a link picks up ("...check this out: https://...!").
 * A closing bracket is only trimmed when the link doesn't open one, so
 * Wikipedia-style ".../Moraine_Lake_(Alberta)" survives.
 */
export function firstLink(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const m = c?.match(/https?:\/\/[^\s<>"']+/i);
    if (!m) continue;
    let url = m[0];
    for (;;) {
      const last = url.slice(-1);
      if (/[.,;!?]/.test(last)) { url = url.slice(0, -1); continue; }
      if (last === ')' && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) { url = url.slice(0, -1); continue; }
      break;
    }
    return url;
  }
  return null;
}

/** Query parameters that only identify who shared a link or where a click came from. */
const TRACKING = /^(utm_.+|igsh|igshid|fbclid|gclid|si|mc_eid|ref_src)$/i;

/**
 * A link as it should be stored: no tracking. Instagram's share links carry
 * `?igsh=...`, a token for the person who shared it - saved as-is, every Den
 * member would see it (CLAUDE.md §7: store the reel URL, nothing more). For
 * Instagram the query is dropped entirely; elsewhere only tracking parameters.
 */
export function cleanLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (/(^|\.)instagram\.com$/i.test(u.hostname)) {
      u.search = '';
      u.hash = '';
    } else {
      for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return null;   // not a URL - pasted words aren't a link to store or open
  }
}

/** A link the reel pipeline can read. Anything else goes to search (CLAUDE.md §7: more than one source). */
export const isReelLink = (url: string | null | undefined) =>
  !!url && /instagram\.com\/(?:reel|reels|p|tv)\/[\w-]+/i.test(url);

/**
 * Words to start a search with, for something the reel pipeline can't read:
 * the text around a link ("Dineen Coffee https://..."), or the place name a
 * maps link carries in its path or `q`. Empty when there's nothing to go on.
 */
export function searchHint(url: string | null | undefined, text?: string | null): string {
  const words = (text ?? '').replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();
  if (words) return words.slice(0, 120);
  if (!url) return '';
  try {
    const u = new URL(url);
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/i)?.[1];
    const named = place ?? u.searchParams.get('q') ?? u.searchParams.get('query') ?? u.searchParams.get('name');
    return named ? decodeURIComponent(named.replace(/\+/g, ' ')).trim().slice(0, 120) : '';
  } catch {
    return '';
  }
}

/**
 * The terms and privacy policy, served by the proxy so they need no domain.
 * App Review wants both reachable from inside the app.
 */
const PROXY = process.env.EXPO_PUBLIC_PROXY_URL || 'https://ruckus-production-1747.up.railway.app';
export const legalLinks = {
  terms: `${PROXY}/terms`,
  privacy: `${PROXY}/privacy`,
};

/** Opens a web page. A failure is swallowed: there is nothing useful to show. */
export const openLink = (url: string) => { Linking.openURL(url).catch(() => {}); };
