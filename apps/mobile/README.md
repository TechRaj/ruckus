# apps/mobile

The Ruckus iOS app. React Native, Expo **dev build** (not Expo Go — the share
extension needs native code).

## Bringing an existing project in

1. Branch off `master`: `git switch -c mobile`
2. Copy the project's contents **into this folder**, so `apps/mobile/package.json`
   and `apps/mobile/app.json` sit here. Leave behind `node_modules/`, `ios/`,
   `android/` and `.expo/` — they are regenerated, and gitignored anyway.
3. In `apps/mobile/package.json`, set `"name": "@ruckus/mobile"` and add:
   ```json
   "dependencies": {
     "@ruckus/api": "*",
     "@ruckus/ingest": "*"
   }
   ```
4. In the **root** `package.json`, add `"apps/mobile"` to `workspaces`.
5. From the repo root: `npm install`, then `cd apps/mobile && npx expo run:ios`.
6. Push the branch and open a PR.

Expo SDK 52+ detects the monorepo on its own. On an older SDK, Metro needs a
`metro.config.js` that watches the repo root — ask before fighting it.

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
