# apps/mobile

`@ruckus/mobile` — the Ruckus iOS app. React Native on Expo SDK 57 (RN 0.86,
TypeScript). Runs in Expo Go today, with RevenueCat in its preview mock; real
purchases and the share extension need the dev build (`npm run ios`).

    npm install                    # from the repo root — this is a workspace
    npm run mobile                 # expo start
    npm run typecheck:mobile       # tsc, unused locals/params are errors

The standing context is the root `CLAUDE.md`. Design boards: `design/boards/`.

## Layout

    App.tsx                 fonts, providers, the navigator
    src/
      types/index.ts        the shapes agreed with the backend, plus Filter / Sort,
                            CATEGORY_LABEL, CONFIDENT, PLAN_THRESHOLD — every shared
                            constant and type lives here
      api/types.ts          the Api interface every screen builds against
      api/client.ts         picks the adapter: mock without keys, real with them
      api/mock.ts           in-memory adapter (mockData.ts holds the fixtures)
      api/ruckus.ts         the real adapter over @ruckus/api + @ruckus/ingest
      billing/purchases.ts  Ruckus Pro: the only file that knows RevenueCat exists —
                            configure, identify, paywall, Customer Center
      state/StashContext.tsx the deep module: loads, filters (person × category × query),
                            sorts, selects, and exposes derived views (visible,
                            nearlyPlans, savedCountBy). Screens read; they don't derive.
      state/stashCopy.ts    pure: filter state → kicker / headline / empty line
      hooks/                useSheetGeometry (every detent number, one seam),
                            useMapCamera (pan / zoom / recentre), useStashMarkers
      navigation/           three tabs + OverlayHost for the save loop
      screens/              one file per screen; composition only
                            (SignIn → Onboarding → tabs, gated by session)
      components/           shared pieces; each is one thing
      theme/tokens.ts       colour, type, spacing, motion, layout, glass
      theme/lines.ts        Rascal's lines and the mono hints, all in one place
      theme/motion.ts       easing curves, haptics, Reduce Motion / Transparency hooks
      theme/critters.ts     the pre-rendered heads and Rascal's poses
      lib/time.ts           `ago()` — the one relative-date formatter
    assets/critters/        the five renders (from ../../design/boards/renders/)
    assets/textures/        the grain tile

## Rules the code keeps

- **Tangerine means tappable** and nothing else. Titles stay ink.
- **One pane of glass** — the Places sheet (`GlassSheetBackground`). Nothing else blurs.
- **Rascal talks in a bubble only while doing something** — sniffing, the save.
  Empty states show his line as plain text (`EmptyState`).
- **Pins say almost nothing** (§12). Category is the glyph, never colour.
  Avatars appear on pins only when filtered to one person.
- **Every optional animation checks `useReduceMotion()`.** UI motion ≤ 300ms on
  `EASE_OUT`; the sheet uses the iOS drawer curve; the only spring is the Saved cheer.
- **Screens don't compute** — if a screen needs a derived list or a count, add it to
  `StashContext` and read it.

## Known gaps

- The real adapter has been written against the package types but **not yet run
  against the Supabase project** — needs `apps/mobile/.env` filled in, then a
  pass through sign-in → Den → share → save on a device.
- The paywall opens from the Ruckus Pro row on People, but nothing calls it on
  `needsUpgrade` yet — there's no way to make a second Den (Switch Den is a
  no-op). When there is: `showPaywallIfNeeded()`, then retry. `is_pro` lands by
  webhook a few seconds after the purchase, so the retry needs a short backoff.
- No ads. RevenueCat tracks ads, it doesn't serve them; "no ads" needs an ad
  SDK first, gated on `isPro` from `useStash()`.
- No share extension yet; `api.resolveSharedUrl` is a mock. Needs a dev build (§11.3).
- Rascal has one render. `rascalSniff` and `rascalCheer` alias the peek pose until
  the other two are rendered off the same rig.
- The glass sheet blurs over `MapView`. Test the drag on a real device at all three
  detents; Reduce Transparency's opaque path is the fallback.
- Apple Maps basemap is unstyled; the `map*` and `dusk` tokens wait for MapLibre.
- "Make it a Caper", "Remove from Stash" and "Switch Den" are no-ops.
- No clustering. Add `supercluster` once a Stash passes ~50 pins.

## The backend seam

`src/api/client.ts` picks an adapter for the `Api` interface in `src/api/types.ts`:

| | |
| --- | --- |
| `src/api/mock.ts` | in-memory. Used when `EXPO_PUBLIC_SUPABASE_URL` is unset — Expo Go with no keys. Sign in with any email and any six digits, make a Den, six places appear. |
| `src/api/ruckus.ts` | `@ruckus/api` (Supabase) + `@ruckus/ingest` (proxy). The only file that knows either package exists; all shape translation lives here. |

`src/types/ruckus-packages.d.ts` types the two JS packages for TypeScript —
extend it as you reach for more of them.

Shape translation in `ruckus.ts`: the backend's stash row is one row **per
place** with everyone who saved it; `StashItem` takes the first saver as
`savedBy`, formats `distanceM`, and folds the model's free-text category into
`eat / drink / do` for the pin glyph (`toCategory`). `stash.save` wants the
`ResolvedPlace` objects back verbatim, so the last resolve is cached by place id.

**Still open on the backend side** — ask before working around:

- `confirmMode: 'multi'` (itinerary reels) is downgraded to "pick one"; the
  pick-several screen isn't designed yet.
- Onboarding creates one Den; `dens.mine()[0]` is the active Den. Switching
  Dens is a no-op.

## Talking to the backend

Screens never call Supabase or the proxy directly. Two imports cover it:

```js
import { createRuckus } from '@ruckus/api';        // accounts, Dens, the Stash
import { extractFromReel } from '@ruckus/ingest';  // reel link -> places
```

**Setup, once:**

```js
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';   // supabase-js needs URL in React Native

export const ruckus = createRuckus({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,   // the ANON key - never the service role key
  storage: AsyncStorage,
});
```

**Sign in** — emailed 6-digit code:

```js
await ruckus.auth.sendCode(email, { displayName });
const userId = await ruckus.auth.verifyCode(email, code);
// StashContext then calls identify(userId) -> Purchases.logIn, or Pro never unlocks
```

**Shared link -> confirm screen:**

```js
const { data } = await ruckus.supabase.auth.getSession();
const result = await extractFromReel(url, {
  endpoint:        `${process.env.EXPO_PUBLIC_PROXY_URL}/extract`,
  geocodeEndpoint: `${process.env.EXPO_PUBLIC_PROXY_URL}/geocode`,
  accessToken:     data.session.access_token,   // the proxy refuses calls without it
});
// result.confirmMode:  'single' | 'choose' | 'multi' | 'search'
// result.candidates:   ResolvedPlace[]  (CLAUDE.md §9)
// each has .explanation.text for the line under the name - "Matched from a tagged handle"
```

**Confirm -> saved:**

```js
await ruckus.stash.save({ denId, places: picked, note });
await ruckus.confirmations.log({ mode: result.confirmMode, offered: result.candidates, chosen: pickedIndexes });
```

**Places screen:**

```js
const rows = await ruckus.stash.list(denId, { lat, lng });   // Nearby: sort by distanceM; Date: sort by when.start
const stop = ruckus.stash.onChange(denId, reload);           // a friend's save appears live
```

**Dens and the paywall:**

```js
try {
  await ruckus.dens.create(name);      // or ruckus.dens.join(code)
} catch (e) {
  if (e.needsUpgrade) showPaywall();   // free tier is 2 Dens
  else showError(e.message);           // every RuckusError has a readable message
}
```

Full list of functions and error codes: `supabase/README.md`.

## `.env` for the app

Expo only exposes variables prefixed `EXPO_PUBLIC_`, and everything prefixed
that way ends up **inside the app** — readable by anyone who downloads it. Only
these four belong there:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_PROXY_URL=https://ruckus-production-1747.up.railway.app
EXPO_PUBLIC_REVENUECAT_KEY=
```

Never the service role key, the OpenRouter key, the Places key or
`PROXY_SECRET`. Those live on the proxy.

## Ask before building

- **The multi-place confirm screen isn't in the Figma.** Itinerary reels return
  up to 8 places and need a "pick which to save" screen.
- The share extension needs a physical iPhone to test — the simulator has no
  Instagram app to share from.
