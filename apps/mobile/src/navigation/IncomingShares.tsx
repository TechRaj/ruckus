/**
 * Links shared into Ruckus from another app - the core flow (CLAUDE.md §9):
 * see a reel, tap Share, pick Ruckus, and land on "Think I found it".
 *
 * The share extension itself is thin: it hands the link to the app through
 * the ruckus:// scheme and the app does the work, through the same confirm
 * screen as a pasted link. So there's one resolve path, not two.
 *
 * A share can arrive before there's anywhere to save it. This component only
 * mounts once someone is signed in (RootNavigator's ready branch), but they may
 * not be in a Den yet, or be halfway through something - making a Caper,
 * signing out. The share waits for that, then opens.
 *
 * Native code: on a build made before expo-share-intent was added, the
 * module is missing and this switches itself off instead of crashing.
 */
import { useEffect, useRef } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useShareIntent } from 'expo-share-intent';
import { cleanLink, firstLink, searchHint } from '../lib/links';
import { USE_MOCKS } from '../api/client';
import { Overlay, useStash } from '../state/StashContext';
import { paletteIsStale } from '../theme/clock';

const AVAILABLE = requireOptionalNativeModule('ExpoShareIntentModule') != null;

/** Sheets a share mustn't interrupt - it would throw away what they were doing. */
const BUSY: Overlay['kind'][] = ['caper', 'caper-made', 'sign-out', 'delete-account'];

export function IncomingShares() {
  const { den, overlay, openOverlay } = useStash();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: !AVAILABLE,
    resetOnBackground: true,
  });

  // resetShareIntent is a new function each render; keep it out of the deps
  const reset = useRef(resetShareIntent);
  reset.current = resetShareIntent;
  // each share opens once, even if the effect re-runs before the reset lands
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent) return;
    if (!den || BUSY.includes(overlay.kind)) return;   // re-runs when that changes
    // At dusk or dawn, with no sheet open, the app is about to reload into the
    // other palette. Taking the share now would clear it just before that
    // reload; leave it for the next run. With a sheet open there's no reload,
    // so open it now.
    if (!USE_MOCKS && overlay.kind === 'none' && paletteIsStale(true)) return;
    const key = `${shareIntent.webUrl ?? ''}\n${shareIntent.text ?? ''}`;
    if (handled.current === key) return;
    handled.current = key;
    reset.current();

    const url = cleanLink(firstLink(shareIntent.webUrl, shareIntent.text));
    const text = shareIntent.text?.trim();
    // a link goes straight to resolving; other text - an address, a name -
    // starts a search with it; nothing usable opens Add a place
    if (url) openOverlay({ kind: 'confirm', url, query: searchHint(url, shareIntent.text) });
    else if (text) openOverlay({ kind: 'confirm', url: null, query: text.slice(0, 120) });
    else openOverlay({ kind: 'add' });
  }, [hasShareIntent, shareIntent, den, overlay.kind, openOverlay]);

  // a new share of the same link, after this one was handled, should open again
  useEffect(() => { if (!hasShareIntent) handled.current = null; }, [hasShareIntent]);

  return null;
}
