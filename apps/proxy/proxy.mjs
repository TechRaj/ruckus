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
import { timingSafeEqual } from 'node:crypto';
import { SYSTEM } from '@ruckus/ingest';

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


/* ------------------------------------------------------------------ *
 * Who is allowed to spend the budget.
 *
 * The app sends the signed-in user's Supabase access token, which we check
 * with Supabase Auth. Nothing baked into the app binary is enough, because
 * anything in the binary can be read out of it. Our own tooling (the
 * harness) sends PROXY_SECRET instead.
 *
 * Enforced whenever it CAN be - i.e. once SUPABASE_URL or PROXY_SECRET is
 * set. With neither, the proxy runs open and says so loudly at boot, which is
 * only acceptable on a laptop.
 * ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const AUTH_ENFORCED = Boolean(SUPABASE_URL || process.env.PROXY_SECRET);
if (!AUTH_ENFORCED) {
  console.warn('!! proxy is OPEN: set SUPABASE_URL (+ SUPABASE_ANON_KEY) or PROXY_SECRET before deploying');
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

// token -> { userId, until }. Checking costs a round trip to Supabase, and
// the share extension makes several proxy calls per reel with the same token.
const verified = new Map();
const VERIFY_TTL_MS = 5 * 60_000;

async function userFromToken(token) {
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return hit.userId;
  if (!SUPABASE_URL) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const { id } = await r.json();
    if (!id) return null;
    if (verified.size > 5_000) verified.clear();
    verified.set(token, { userId: id, until: Date.now() + VERIFY_TTL_MS });
    return id;
  } catch {
    return null;   // Supabase unreachable: fail closed, not open
  }
}

async function requireCaller(req, res, next) {
  if (!AUTH_ENFORCED) { req.caller = req.ip; return next(); }

  const key = req.headers['x-ruckus-key'];
  if (key && process.env.PROXY_SECRET && safeEqual(key, process.env.PROXY_SECRET)) {
    req.caller = 'tooling';
    return next();
  }
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  const userId = bearer ? await userFromToken(bearer) : null;
  if (!userId) return res.status(401).json({ error: 'sign in required' });
  req.caller = userId;   // rate limits are per user, not per shared IP
  next();
}

app.use(['/extract', '/geocode', '/alarm'], requireCaller);

app.post('/extract', async (req, res) => {
  // The client used to send `system` and we trusted it, which made this a free
  // general-purpose chatbot on our key for anyone who found the URL. The
  // prompt now lives here; anything the client sends as `system` is ignored.
  const { message } = req.body ?? {};
  const system = SYSTEM;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message required' });
  }
  if (message.length > 8000) {
    return res.status(413).json({ error: 'message too long' });
  }

  if (rateLimited(req.caller)) {
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
          // cache_control marks the static system block as cacheable. Whether
          // it engages depends on the model's minimum cacheable prompt length,
          // so /extract reports what came back rather than assuming.
          process.env.PROMPT_CACHE === '0'
            ? { role: 'system', content: system }
            : { role: 'system', content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] },
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
    const cached = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    console.log(
      `[extract] ${data.model ?? MODEL} ` +
      `in=${data.usage?.prompt_tokens ?? '?'} (cached ${cached}) out=${data.usage?.completion_tokens ?? '?'} ` +
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
  if (rateLimited(req.caller)) return res.status(429).json({ error: 'slow down' });

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


/* ------------------------------------------------------------------ *
 * /config - the two regexes that break when Instagram changes format.
 *
 * §5.4: ship them from the server so a fix is a deploy, not an App Store
 * review. The app fetches this at launch, passes it to configure(), and falls
 * back to its built-ins if this is unreachable - so an outage here is
 * invisible, not fatal.
 *
 * Override without a code change by setting WRAPPER_RE / PROFILE_NAME_RE.
 * ------------------------------------------------------------------ */
app.get('/config', (_, res) => {
  const patterns = {};
  if (process.env.WRAPPER_RE) patterns.wrapper = process.env.WRAPPER_RE;
  if (process.env.PROFILE_NAME_RE) patterns.profileName = process.env.PROFILE_NAME_RE;
  // cache briefly: every cold start asks, and a fix should still land fast
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ patterns, updatedAt: process.env.CONFIG_UPDATED_AT ?? null });
});

/* ------------------------------------------------------------------ *
 * /alarm - the canary for Instagram changing og:description.
 *
 * wrapperOk:false means the wrapper regex stopped matching. One is a weird
 * post; a sustained rate is the format having moved, and the whole app is
 * blind until the regex is fixed. Counted in memory, which is enough to see
 * it on /health - wire it to something real before launch.
 *
 * Deliberately takes no caption and no URL. §5.6 says no Instagram content is
 * retained, and an alarm endpoint is exactly where that promise gets broken
 * by accident.
 * ------------------------------------------------------------------ */
const alarms = { wrapperFail: 0, wrapperOk: 0, since: new Date().toISOString() };

app.post('/alarm', (req, res) => {
  const { kind } = req.body ?? {};
  if (kind === 'wrapper_fail') alarms.wrapperFail++;
  else if (kind === 'wrapper_ok') alarms.wrapperOk++;
  else return res.status(400).json({ error: 'unknown kind' });

  const total = alarms.wrapperFail + alarms.wrapperOk;
  const rate = total >= 20 ? alarms.wrapperFail / total : null;
  if (rate !== null && rate > 0.25) {
    console.error(`[ALARM] wrapper regex failing on ${(rate * 100).toFixed(0)}% of ${total} parses - Instagram may have changed og:description`);
  }
  res.json({ ok: true });
});


/* ------------------------------------------------------------------ *
 * /webhooks/revenuecat - the only thing that ever sets profiles.is_pro.
 *
 * The database uses is_pro to lift the free Den limit, and users cannot set
 * it themselves (column grants in the migration). RevenueCat calls this on
 * every purchase event; we write the result with the service role key.
 *
 * Needs, on Railway: REVENUECAT_WEBHOOK_AUTH (the exact Authorization value
 * you type into RevenueCat's webhook settings), SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY. The app must call Purchases.logIn(supabaseUserId)
 * after sign-in, or events arrive with an anonymous id we cannot map to a user.
 * ------------------------------------------------------------------ */

const GRANTS_PRO = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT',
]);
const ENDS_PRO = new Set(['EXPIRATION']);
// CANCELLATION and BILLING_ISSUE deliberately change nothing: a cancelled
// subscription keeps working until it expires, and EXPIRATION tells us when.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.post('/webhooks/revenuecat', async (req, res) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'webhook not configured' });
  }
  if (!safeEqual(req.headers.authorization ?? '', expected)) {
    return res.status(401).json({ error: 'bad auth' });
  }

  const ev = req.body?.event ?? {};
  const pro = GRANTS_PRO.has(ev.type) ? true : ENDS_PRO.has(ev.type) ? false : null;
  // 200 on everything we choose to ignore, or RevenueCat retries it forever
  if (pro === null) return res.json({ ok: true, ignored: ev.type ?? 'unknown' });

  const userId = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])]
    .find(id => typeof id === 'string' && UUID.test(id));
  if (!userId) {
    console.warn(`[revenuecat] ${ev.type} for an anonymous id - is Purchases.logIn() being called?`);
    return res.json({ ok: true, ignored: 'anonymous user' });
  }

  // Events can arrive out of order. Only apply one newer than what we have,
  // so a late RENEWAL can't resurrect Pro after an EXPIRATION.
  const at = new Date(ev.event_timestamp_ms ?? Date.now()).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}` +
              `&or=(pro_updated_at.is.null,pro_updated_at.lt.${encodeURIComponent(at)})`;
  try {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ is_pro: pro, pro_updated_at: at }),
    });
    if (!r.ok) {
      console.error('[revenuecat] supabase', r.status, (await r.text()).slice(0, 200));
      return res.status(500).json({ error: 'write failed' });   // RevenueCat will retry
    }
    console.log(`[revenuecat] ${ev.type} -> is_pro=${pro} for ${userId.slice(0, 8)}…`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[revenuecat]', err.message);
    res.status(500).json({ error: 'write failed' });
  }
});

app.get('/health', (_, res) => {
  const total = alarms.wrapperFail + alarms.wrapperOk;
  res.json({
    ok: true,
    model: MODEL,
    geocode: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    auth: AUTH_ENFORCED ? 'enforced' : 'OPEN',
    wrapper: { ...alarms, failRate: total ? +(alarms.wrapperFail / total).toFixed(3) : null },
  });
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`proxy listening on ${process.env.PORT || 3000}, model=${MODEL}`)
);
