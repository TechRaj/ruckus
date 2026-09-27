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
| `RATE_MAX` | no | Requests per minute per IP, default 20. Raise only for batch tooling. |
| `WRAPPER_RE` | no | Emergency override for the caption regex. |
| `PROFILE_NAME_RE` | no | Emergency override for the profile-name regex. |

Railway sets `PORT` itself — don't.

Point the app at it:

```
EXTRACT_ENDPOINT=https://<your-app>.up.railway.app/extract
GEOCODE_ENDPOINT=https://<your-app>.up.railway.app/geocode
```

## Two things to check before launch

**The rate limit is in-memory**, so it resets on restart and is per-instance.
That's fine for one box; run two and it's really 2× the limit. Move to Redis
when there's more than one.

**`/extract` and `/geocode` are unauthenticated.** Anyone who finds the URL can
spend your OpenRouter and Places budget. Before this is public, add a shared
secret the app sends and the proxy checks, and cap spend on both providers.
