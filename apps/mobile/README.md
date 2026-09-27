# apps/mobile

`@ruckus/mobile` — the Ruckus iOS app. React Native on Expo SDK 57 (RN 0.86,
TypeScript). Runs in Expo Go today; the share extension will force a dev build.

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
      api/client.ts         the single seam to the backend (USE_MOCKS is set here)
      api/mockData.ts       one Den, four members, six places
      state/StashContext.tsx the deep module: loads, filters (person × category × query),
                            sorts, selects, and exposes derived views (visible,
                            nearlyPlans, savedCountBy). Screens read; they don't derive.
      state/stashCopy.ts    pure: filter state → kicker / headline / empty line
      hooks/                useSheetGeometry (every detent number, one seam),
                            useMapCamera (pan / zoom / recentre), useStashMarkers
      navigation/           three tabs + OverlayHost for the save loop
      screens/              one file per screen; composition only
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

- **`src/api/client.ts` still runs on mocks (`USE_MOCKS = true`) and assumes REST
  endpoints that don't exist.** The backend is `@ruckus/api` + `@ruckus/ingest`
  (below). Wiring it is the next job — see "Wiring the backend".
- Onboarding collects a name, critter and Den and still discards them.
- No paywall. RevenueCat is a hard Shipaton requirement.
- No share extension yet; `api.resolveSharedUrl` is a mock. Needs a dev build (§11.3).
- Rascal has one render. `rascalSniff` and `rascalCheer` alias the peek pose until
  the other two are rendered off the same rig.
- The glass sheet blurs over `MapView`. Test the drag on a real device at all three
  detents; Reduce Transparency's opaque path is the fallback.
- Apple Maps basemap is unstyled; the `map*` and `dusk` tokens wait for MapLibre.
- "Make it a Caper", "Remove from Stash", "Ruckus Pro" and "Switch Den" are no-ops.
- No clustering. Add `supercluster` once a Stash passes ~50 pins.

## Wiring the backend

`src/api/client.ts` is the single seam. Every screen calls `api.*` and nothing
else, so the swap is one file. What each call maps to:

| `api.*` today (mock) | Replace with |
| --- | --- |
| `getDen`, `getStash(denId)` | `ruckus.dens.mine()` + `ruckus.dens.members()`, `ruckus.stash.list(denId, {lat, lng})` |
| `resolveSharedUrl(url)` | `extractFromReel(url, { endpoint, geocodeEndpoint, accessToken })` → `result.candidates` |
| `saveToStash({denId, placeId, sourceUrl})` | `ruckus.stash.save({ denId, places: picked, sourceUrl })` + `ruckus.confirmations.log(...)` |
| `toggleInterest(stashId)` | `ruckus.stash.setWant(denId, placeId, want)` |
| `searchPlaces(q)` | proxy `/geocode` (via `@ruckus/ingest`) |
| `createDen(name)`, `getInviteLink(denId)` | `ruckus.dens.create(name)`, `ruckus.dens.invite(denId)` — handle `e.needsUpgrade` → paywall |
| `addTake` / `updateTake` / `deleteTake` | **no backend yet** — comments per place need a table |
| (none) | `ruckus.auth.sendCode` / `verifyCode` — the app has no sign-in screen yet |
| (none) | `ruckus.stash.onChange(denId, reload)` — live updates |

Shape differences to reconcile in `src/types/index.ts`: the backend's stash row
is one row **per place** with everyone who saved it; the app's `StashItem` is
one row per save with a single `savedBy`. `category` (`eat`/`drink`/`do`) and
the human `note` line must come from `ResolvedPlace`/`saves` — check what
`toStashRow` returns before mapping.

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
await Purchases.logIn(userId);   // RevenueCat: ties purchases to this user, or Pro never unlocks
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
