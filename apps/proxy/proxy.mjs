/**
 * proxy.mjs - the smallest thing that keeps your API key off the device.
 *
 *   npm i express
 *   OPENROUTER_API_KEY=sk-or-... node proxy.mjs
 *
 * An API key shipped in an app binary is extractable in minutes, so the
 * model call has to run somewhere you control. This is that somewhere.
 *
 * Goes through OpenRouter so the model is a string, not an integration.
 * Swapping providers to compare accuracy is an env var:
 *
 *   MODEL=google/gemini-3.7-flash      node proxy.mjs   # $0.75 / $3.75 per 1M
 *   MODEL=anthropic/claude-haiku-4.5   node proxy.mjs   # $1.00 / $5.00
 *   MODEL=anthropic/claude-sonnet-4.6  node proxy.mjs   # $3.00 / $15.00
 *
 * Deploy to Railway, Fly, Render, or a Lambda - it has no state.
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '64kb' }));

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.MODEL || 'anthropic/claude-haiku-4.5';

// 1200 truncated multi-place travel reels, and a truncated response is
// invalid JSON, which extract-llm.js swallows as a heuristic fallback.
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 4000);

if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY is unset - every request would 502.');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Rate limiting. Naive and in-memory, which is fine until it isn't.
 * Swap for Redis when you have more than one instance.
 * ------------------------------------------------------------------ */
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
// 20 is right for a phone. Batch tooling over the whole corpus needs headroom,
// so it is an env var rather than a reason to comment the limiter out.
const MAX_PER_WINDOW = Number(process.env.RATE_MAX || 20);
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.clear();   // crude ceiling
  return list.length > MAX_PER_WINDOW;
}

app.post('/extract', async (req, res) => {
  const { system, message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message required' });
  }
  if (message.length > 8000) {
    return res.status(413).json({ error: 'message too long' });
  }

  const who = req.headers['x-device-id'] || req.ip;
  if (rateLimited(who)) {
    return res.status(429).json({ error: 'slow down' });
  }

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        // shows up on OpenRouter's dashboard so you can tell runs apart
        'HTTP-Referer': process.env.APP_URL || 'http://localhost',
        'X-Title': 'reel-place-extract',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // ask for JSON at the API level rather than stripping ``` fences
        // downstream. Providers that ignore it still return the fenced
        // form, which extract-llm.js already handles.
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('[openrouter]', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'upstream failed' });
    }

    const data = await r.json();
    // OpenRouter reports upstream failures as 200 + an error body
    if (data.error) {
      console.error('[openrouter]', JSON.stringify(data.error).slice(0, 300));
      return res.status(502).json({ error: 'upstream failed' });
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? '';
    if (!text) {
      console.error('[openrouter] empty completion, finish_reason=', choice?.finish_reason);
      return res.status(502).json({ error: 'empty completion' });
    }
    // a truncated response is invalid JSON downstream - say so here
    if (choice.finish_reason === 'length') {
      console.error(`[openrouter] hit MAX_TOKENS (${MAX_TOKENS}) - raise it`);
    }

    // Log cost and model, never the caption. The caption is the creator's
    // writing, and §5.6 of the context doc says no Instagram content is
    // retained. usage.cost is what this run is actually spending.
    console.log(
      `[extract] ${data.model ?? MODEL} ` +
      `in=${data.usage?.prompt_tokens ?? '?'} out=${data.usage?.completion_tokens ?? '?'} ` +
      `cost=$${(data.usage?.cost ?? 0).toFixed(5)}`
    );

    res.json({ text, model: data.model ?? MODEL, cost: data.usage?.cost ?? null });
  } catch (err) {
    console.error('[extract]', err.message);
    res.status(502).json({ error: 'extraction failed' });
  }
});


/* ------------------------------------------------------------------ *
 * /geocode - candidate name -> a real place with a stable id.
 *
 * Same reason as /extract: the Places key cannot sit in the binary either.
 * Uses the Places API (New) Text Search, which returns `id` - the stable
 * place id the whole schema dedupes on.
 *
 * Cached in memory because the same cafe arrives from several reels, and
 * because Google's terms allow caching place ids indefinitely but other
 * fields only for a limited window. A process-lifetime cache is comfortably
 * inside that and cuts the bill at the same time.
 * ------------------------------------------------------------------ */

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.addressComponents',
].join(',');

const geoCache = new Map();
const GEO_CACHE_MAX = 500;

const componentOf = (components, type) =>
  components?.find(c => c.types?.includes(type))?.longText ?? null;

/** Google's shape -> the shape confidence.js and ResolvedPlace expect. */
function normalisePlace(p) {
  const c = p.addressComponents;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    neighbourhood: componentOf(c, 'neighborhood') ?? componentOf(c, 'sublocality'),
    city: componentOf(c, 'locality') ?? componentOf(c, 'postal_town'),
    types: p.types ?? [],
  };
}

app.post('/geocode', async (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'slow down' });

  const { query, city, bias } = req.body ?? {};
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query required' });
  }
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    // Say so plainly. Silently returning [] reads downstream as
    // geocode_no_match (-5) and quietly poisons every score.
    return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY unset' });
  }

  const text = city ? `${query.trim()} ${city}`.trim() : query.trim();
  const key = text.toLowerCase();

  if (geoCache.has(key)) {
    return res.json({ results: geoCache.get(key), cached: true });
  }

  try {
    const r = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: text,
        maxResultCount: 5,          // confidence.js wants the field, not one answer
        ...(bias ? { locationBias: bias } : {}),
      }),
    });

    if (!r.ok) {
      console.error('[places]', r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: 'geocode failed' });
    }

    const results = ((await r.json()).places ?? []).map(normalisePlace);

    if (geoCache.size >= GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
    geoCache.set(key, results);

    // the query is a place name, not user content - safe to log, useful to have
    console.log(`[geocode] "${text}" -> ${results.length}`);
    res.json({ results, cached: false });
  } catch (err) {
    console.error('[places]', err.message);
    res.status(502).json({ error: 'geocode failed' });
  }
});

app.get('/health', (_, res) => res.json({
  ok: true,
  model: MODEL,
  geocode: Boolean(process.env.GOOGLE_PLACES_API_KEY),
}));

app.listen(process.env.PORT || 3000, () =>
  console.log(`proxy listening on ${process.env.PORT || 3000}, model=${MODEL}`)
);
