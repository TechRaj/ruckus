# @ruckus/proxy

The only thing standing between the app and two API keys. An API key shipped in
an app binary is extractable in minutes, so both the model call and the Places
call run here instead.

Stateless — no database, no sessions. Scale it or restart it freely.

## Routes

| Route | Does |
| --- | --- |
| `POST /extract` | Caption → candidate places, via OpenRouter. |
| `POST /geocode` | Place name → `place_id`, coords, address. Cached in memory. |
| `GET /config` | The two fragile regexes (§5.4), so a format change is a deploy not an App Store review. |
| `POST /alarm` | Counts `wrapperOk:false`. Logs loudly past a 25% sustained failure rate. |
| `GET /health` | Liveness, which model, whether geocoding is configured, wrapper failure rate. |

## Deploying to Railway

Deploy from the repo root — `railway.json` lives there and the build needs the workspace lockfile.

```bash
railway login
railway init
railway up
```

Then set variables in the Railway dashboard:

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | yes | Process exits at boot without it. |
| `GOOGLE_PLACES_API_KEY` | yes | `/geocode` returns 503 without it. |
| `MODEL` | no | Defaults to `anthropic/claude-haiku-4.5`. |
| `MAX_TOKENS` | no | Defaults to 4000. Below ~2000 truncates itinerary reels into invalid JSON. |
| `RATE_MAX` | no | Requests per minute per caller, default 20. Raise only for batch tooling. |
| `DAILY_EXTRACT_MAX` | no | Reels a user can resolve per UTC day, default 100. |
| `DAILY_GEOCODE_MAX` | no | Place lookups per user per UTC day, default 800 (a reel uses up to 8). |
| `WRAPPER_RE` | no | Emergency override for the caption regex. |
| `PROFILE_NAME_RE` | no | Emergency override for the profile-name regex. |

Railway sets `PORT` itself — don't.

Point the app at it:

```
EXTRACT_ENDPOINT=https://<your-app>.up.railway.app/extract
GEOCODE_ENDPOINT=https://<your-app>.up.railway.app/geocode
```

## Two things to check before launch

**The rate limit and the daily cap are in memory**, so they reset on redeploy
and are per-instance. Fine for one box; run two and each allows the full limit.
Move them to a Supabase table when there's more than one.

Over the daily cap, `/extract` and `/geocode` return
`429 { "error": "daily_limit_reached" }`. `extractFromReel()` still returns the
offline ranker's guesses but sets `limited: true` — show the user why the results
got worse. Tooling calls with `PROXY_SECRET` are never capped. `/health` shows
today's totals (counts only, never user ids).

**Callers must be signed in.** `/extract` and `/geocode` require a Supabase
access token (the app) or `PROXY_SECRET` (tooling). Still set a credit limit on
OpenRouter and a quota on Places as a backstop.
