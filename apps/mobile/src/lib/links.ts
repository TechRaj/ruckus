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
    return url;   // not a URL we can parse - leave it rather than lose it
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
