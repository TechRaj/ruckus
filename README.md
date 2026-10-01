<p align="center">
  <img src="apps/mobile/assets/icon.png" width="120" alt="Ruckus app icon: a raccoon peeking over a ledge" />
</p>

<h1 align="center">Ruckus</h1>

<p align="center">Turn the places your friends send you into plans you actually make.</p>

---

You see a reel of a café, a bar or a hike. You share it to Ruckus. Ruckus works
out **where it is**, drops a pin on a map your friend group shares (a **Den**),
and when enough of you want to go, it becomes a plan on the calendar (a **Caper**).

Saved reels are a black hole: people save hundreds and never see them again, and
nobody can see what their friends saved for the same city. Ruckus is the place
those saves go instead.

An iOS app, built with React Native (Expo).

## How it works

```text
share a link from any app
        │
        ▼
 ON THE PHONE   read the link's public preview (title, caption, cover image)
                pull out @handles, #hashtags and the caption text
                look up each tagged handle's display name
        │
        ▼
 PROXY          a language model picks out the places the caption names
                Google Places turns each one into a real place, with coordinates
        │
        ▼
 ON THE PHONE   a confidence score from facts we can check, not the model's say-so
                you confirm the right place - nothing is saved until you do
        │
        ▼
 DATABASE       the place id and the link, in your Den's shared map
```

The hard part is that a reel has **no location data**: there's no GPS and no
EXIF. The place has to be inferred from the caption, the tags and the hashtags.
About half of reels name the venue in the text and half only tag it, so the
pipeline does both. [`CLAUDE.md` §5](CLAUDE.md) explains the full reasoning.

**Measured, not guessed.** Over a hand-labelled set of 30 reels, the model found
a place in **93%** of them. Of 70 extracted places, **67 were correct, 3 partly
correct and 0 wrong**. The confidence score separates right pins from wrong ones
cleanly: every "high" pin was right, and every "low" pin was wrong. The harness
and the labelled results are in [`tools/harness/`](tools/harness/).

Links that aren't reels (TikTok, Google Maps, a restaurant's site) and plain
text ("Dineen Coffee") go straight to a pre-filled place search, so every share
leads somewhere.

## Features

- **Share to save:** "Save to Ruckus" in the iOS share sheet, from any app
- **Dens:** private friend groups, joined with a six-character code
- **One map, one list:** a bottom sheet over a live map; tap a pin to find its
  row, tap a row to find its pin. Filter by friend, sort by distance or date.
- **Capers:** "I'm in" on a place, then pick a day; reminders 7, 3 and 1 day before
- **Comments**, one per person per place
- **Ruckus Pro:** the free tier is 3 Dens and 25 places per Den; Pro lifts both
- **Safety:** report and block, account deletion, terms agreed at sign-in
- **Day and night:** the whole palette follows the clock

## Privacy by design

We store a **place id and a link**, nothing more. No media is downloaded or
re-hosted, captions aren't kept after a place is found, Ruckus never logs in to
any other service, and your location is used only to sort by distance and is
never stored. See the [privacy policy](https://ruckus-production-1747.up.railway.app/privacy)
and [`CLAUDE.md` §7](CLAUDE.md).

## Stack

| Layer | |
| --- | --- |
| App | React Native 0.86, Expo SDK 57 (dev build), TypeScript, Reanimated, `@gorhom/bottom-sheet`, a share extension |
| Backend | Supabase (Postgres with row-level security on every table, auth by emailed code, realtime) |
| Proxy | Node + Express on Railway: the model call, place lookups, reminders, the RevenueCat webhook |
| Model | Claude Haiku 4.5, through OpenRouter |
| Places | Google Places API (New) |
| Payments | RevenueCat + App Store subscriptions |

## Repo

| Path | What |
| --- | --- |
| [`apps/mobile`](apps/mobile) | The iOS app. [README](apps/mobile/README.md) |
| [`apps/proxy`](apps/proxy) | The server between the app and the paid APIs. [README](apps/proxy/README.md) |
| [`packages/ingest`](packages/ingest) | Link → scored, geocoded places. No UI. |
| [`packages/api`](packages/api) | The only way the app talks to the database. |
| [`packages/reminders`](packages/reminders) | When to send Caper and event reminders. |
| [`supabase`](supabase) | Schema, migrations, and the database tests. [README](supabase/README.md) |
| [`tools/harness`](tools/harness) | Batch-tests the pipeline over real reels; labelled results. |
| [`design`](design), [`DESIGN.md`](DESIGN.md) | The art and the design system. |
| [`CLAUDE.md`](CLAUDE.md) | The long-form design doc: product, pipeline, legal reasoning, open questions. |

## Running it

Needs Node 20.6+, Xcode, and (for the database tests) a local Postgres.

```bash
npm install
cp .env.example .env          # fill in the keys it lists
npm run mobile:build          # first time: builds and installs the iOS dev build
npm run mobile                # after that: starts the app
```

With no keys in `.env`, the app runs on built-in mock data, so the whole
interface can be explored in the simulator without any accounts.

```bash
npm test                      # unit tests: pipeline, API, reminders, proxy
npm run test:db               # every access and business rule, on a throwaway Postgres
npm run proxy                 # the proxy, locally
npm run harness               # re-run the pipeline over the reel corpus
```

## Team

Karthikraj Sivakumar, Amelia Lon, Shruthi Murali and Quan Teng Wai.

## Licence

[MIT](LICENSE)
