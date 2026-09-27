# Backend tasks — Shruthi

> **Update 28 Sept:** all four tasks are done and merged. Task 1 (Shruthi) is live;
> Tasks 2–4 landed from `backend/spend-cap-and-takes`. Takes live in their own
> table and are attached in `@ruckus/api`, so **`den_stash()` is untouched** —
> your Task 1 migration won't conflict with them. Your event-reminders migration
> is also applied to the live database now (it came along with `db:push`).

The backend is live: a Supabase database (Dens, saves, invites, security rules)
and a proxy on Railway that turns a reel link into places. The app is merged and
talks to both. Your job is the four pieces the app is still faking or missing.

Karthik owns the dashboards (Supabase settings, RevenueCat, Railway). You own the
code. If a task needs a dashboard change, ask him.

## Before you start (30 minutes)

1. Clone `TechRaj/ruckus`, run `npm install` at the root.
2. Get the secrets from Karthik **through a password manager**, not chat — they
   go in a root `.env`, which git ignores. You need `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`,
   `PROXY_SECRET`, `OPENROUTER_API_KEY`, `GOOGLE_PLACES_API_KEY`.
3. Install Postgres locally (`brew install postgresql@14` or newer) — the
   database tests run against a throwaway local copy.
4. Check everything passes before you change anything:
   ```bash
   npm test          # 30 unit tests, no network
   npm run test:db   # 58 database checks on a local throwaway Postgres
   npm run e2e:db    # 18 checks against the real project; cleans up after itself
   ```
5. Read `supabase/README.md` (tables, functions, error codes) and skim
   `supabase/migrations/20260927000000_init.sql`. Everything below follows the
   patterns in that file.

## Rules that will break things if skipped

- **Never edit `20260927000000_init.sql`.** It is already applied to the live
  database. Every change is a **new file** in `supabase/migrations/`, named with
  a later timestamp, e.g. `20260928120000_wanters.sql`.
- **Test locally first.** `npm run test:db` → then `npm run db:push` (applies new
  migrations to the live project, each once) → then `npm run e2e:db`.
- **Every new rule gets a check** in `supabase/tests/schema.test.sql`, the way
  the existing 58 do — especially "a stranger can't see/do this".
- **Writes go through functions** (`create function ... security definer`) that
  check `is_den_member()` first. Tables get RLS for reads. Look at `set_want_to_go`
  for the smallest complete example.
- **Changing what a function returns** (adding a column to `den_stash`) needs
  `drop function` then `create function` — `create or replace` refuses to change
  the return type. Re-add the `grant execute ... to authenticated` after.
- **Tell Amelia and Quan when a shape changes.** They type the packages in
  `apps/mobile/src/types/ruckus-packages.d.ts` and translate in
  `apps/mobile/src/api/ruckus.ts`. The shapes below are already agreed with them
  — stick to them and they can build in parallel.
- Small PRs, one task each, `npm test && npm run test:db` green before you open one.

---

## Task 1 — Show *who* wants to go  ✅ done

**Why:** the Places screen draws a face for each friend who wants to go. Right now
`den_stash()` only returns a count, so the app can only show your own face.

**Do:**
- New migration: `den_stash()` gains a `wanters jsonb` column —
  `[{ "profile_id", "display_name", "avatar" }]`, oldest vote first, `[]` when
  nobody. Keep `want_count` and `i_want` as they are.
- `packages/api/src/index.js` → `toStashRow` adds
  `wanters: [{ id, displayName, avatar }]`.
- Test: two members vote, `den_stash` lists both; a stranger still gets
  `not_a_member`.

**The app then:** sets `interested = wanters.map(w => w.id)`.

**Size:** small. Good first task — it touches every layer once.

## Task 2 — Comments on places ("takes")  ✅ done

**Why:** the app has a comment stack on each place, but there's no table, so
comments live in memory and vanish when the app restarts.

**Agreed shape** (matches the app's `Take` type): **one take per person per place
per Den**. Adding again replaces yours; there are no take ids.

**Do:**
- New table `takes (den_id, place_id, profile_id, body, created_at, updated_at)`,
  primary key `(den_id, place_id, profile_id)`, `body` 1–280 chars. RLS: members
  read; nobody inserts directly.
- `set_take(p_den, p_place, p_body)` — upserts yours. Must be a member, and the
  place must be in that Den's Stash (reuse the `place_not_in_stash` error).
- `delete_take(p_den, p_place)` — removes yours.
- `den_stash()` gains `takes jsonb` — `[{ "profile_id", "body", "created_at" }]`,
  oldest first. (Do Task 1 first — both change `den_stash`, so do them in one
  migration if you like.)
- Add `takes` to the realtime publication (see the last block of the init
  migration), and make `stash.onChange` in `@ruckus/api` listen to it too.
- `@ruckus/api`: `takes.set(denId, placeId, text)`, `takes.remove(denId, placeId)`;
  `toStashRow` adds `takes: [{ userId, text, at }]`.
- Tests: member can set/replace/delete their own; can't touch someone else's;
  stranger can't read or write; a place not in the Stash is refused; 281
  characters is refused.

**The app then:** swaps its in-memory `addTake / updateTake / deleteTake` for
these and reads `takes` off each row.

**Size:** medium — the biggest of the four.

## Task 3 — A daily spend cap per user on the proxy  ✅ done

**Why:** every reel costs a model call and several Places calls, on Karthik's
cards. Rate limits stop bursts, but one account could still run up a bill over a
day.

**Do** (in `apps/proxy/proxy.mjs`):
- Count per caller per UTC day: `/extract` and `/geocode` separately. Limits from
  env with sensible defaults — e.g. `DAILY_EXTRACT_MAX=100`, `DAILY_GEOCODE_MAX=600`.
- Over the limit → `429 { "error": "daily_limit_reached" }`.
- `req.caller === 'tooling'` (the harness, with `PROXY_SECRET`) is exempt.
- In memory is fine to start (resets on redeploy); mention it in the proxy README.
  Moving it into a Supabase table is the upgrade if you have time.
- Show today's totals on `/health` (counts only, no user ids).

**Size:** small.

## Task 4 — Demo seed script  ✅ done

**Why:** the demo video needs a Den with a full map. Nobody wants to share 30
reels by hand to get one.

**Do:** `tools/seed-demo.mjs` + `npm run seed:demo`:
- Takes team members' emails as arguments (they must have signed in once, so
  their accounts exist).
- Creates a Den ("Toronto Shenanigans"), adds them all, and saves ~15 real
  Toronto places across them with notes, a couple of events with dates, some
  want-to-go votes and a few takes.
- Uses real Google place ids. The easiest source is to run the places through the
  proxy's `/geocode` with `PROXY_SECRET` — **never copy rows out of
  `tools/harness/results/`**: those files hold scraped captions and must not end
  up in the public repo.
- Safe to run twice (re-saving is already an upsert).

**Size:** small–medium. Needs Tasks 1–2 for the votes and takes to show.

---

## Order

1 → 2 → 4 are what the demo shows. 3 protects the budget and can go in whenever.

## When you're stuck

- Error codes and every function: `supabase/README.md`
- How the pieces fit: `CLAUDE.md` §5 (pipeline) and §8 (repo layout)
- The proxy's routes and env vars: `apps/proxy/README.md`
- Whether the live proxy is healthy: `https://ruckus-production-1747.up.railway.app/health`
