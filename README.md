# Rucus

Collect places you find on Instagram Reels, turn them into plans with friends.

`CLAUDE.md` is the standing context — product, pipeline, legal, open questions.
Read §5 before touching `packages/ingest/`.

## Layout

| Path | What |
| --- | --- |
| `packages/ingest` | `@ruckus/ingest` — reel URL → scored place candidates. No UI. |
| `apps/proxy` | Model proxy. Keeps the API key off the device. |
| `apps/mobile` | Expo dev build. Not yet scaffolded. |
| `tools/harness` | Batch-test the shipping path over 30 real reels. |

## Setup

```bash
npm install
cp .env.example .env        # then add your OpenRouter key
```

## The measurement loop

```bash
npm run proxy               # terminal 1
npm run harness             # terminal 2
```

Writes `tools/harness/results/results-<model>.csv`, one row per **place** —
an itinerary reel naming six spots is six rows, because that's six saves.

Then fill the `correct?` column by hand. That column is the only real
measurement in the repo; everything else is a count of rows that returned
*something*. Check `engine` first — any `heuristic` row is a proxy failure,
not a model result.

Swap models without touching code:

```bash
MODEL=google/gemini-3.7-flash npm run proxy
```

## Hard rules

- **Never authenticate to Instagram.** No bot accounts, no cookies, no
  logged-in WebView. This is the line that keeps §7 true.
- **Never re-host Instagram media.** Store the reel URL, not the reel.
- **Never put an API key in the app.** The model call goes through the proxy.
- `instagram.js` never imports a ranker. See the layering rule in §8.
