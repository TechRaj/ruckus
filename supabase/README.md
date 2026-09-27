# Supabase

The database for Dens, the Stash, and who's in what. The app talks to it only
through `@ruckus/api` — screens never name a table or write SQL.

## Commands

| | |
| --- | --- |
| `npm run test:db` | Runs every access and business rule against a throwaway local Postgres. No project, no keys. |
| `npm run db:push` | Applies new migrations to the real project, each once. Needs `SUPABASE_DB_URL`. |
| `npm run e2e:db` | Plays two friends and a stranger through `@ruckus/api` against the real project, then deletes everything it made. |

## Tables

| Table | Holds | Who can read it |
| --- | --- | --- |
| `profiles` | name, avatar, `is_pro` | you, and people in a Den with you |
| `dens` | name, crest | members |
| `den_members` | who's in which Den, and the owner | members |
| `den_invites` | the 6-character join codes | members |
| `places` | one row per real place, keyed by Google place id | anyone signed in — it's public map data |
| `saves` | person + place + Den + reel, with the event date if any | members of that Den |
| `want_to_go` | votes per place per Den | members |
| `confirmations` | what the confirm screen offered and what was picked (§5.8) | only you |

Writes go through functions, so the rules that RLS can't express are enforced in one place:

| Function | `@ruckus/api` | Enforces |
| --- | --- | --- |
| `create_den` | `dens.create` | the free-tier Den limit |
| `create_invite` | `dens.invite` | members only; reuses the live code |
| `join_den` | `dens.join` | expiry, max uses, the Den limit; idempotent |
| `leave_den` | `dens.leave` | hands ownership on; deletes an empty Den |
| `save_places` | `stash.save` | membership; upserts the place; keeps event dates |
| `den_stash` | `stash.list` | membership; one row per place, with distance |
| `set_want_to_go` | `stash.setWant` | membership |
| `log_confirmation` | `confirmations.log` | strips captions and `evidence` before storing |

## Errors the app should handle

Raised with a stable key. `@ruckus/api` turns each into a `RuckusError` with
`.code` set to the key and a readable `.message`. Match on `.code`.

| `code` | Show |
| --- | --- |
| `den_limit_reached` | the **Ruckus Pro paywall** (`error.needsUpgrade` is `true`) |
| `invite_invalid` / `invite_expired` / `invite_used_up` | the join screen, with the message |
| `not_a_member` | usually a stale Den id — go back to the Den list |
| `place_missing_id` | route to search: the pipeline couldn't pin it |
| `not_signed_in` | the sign-in screen |

## Rules worth knowing

- **Free tier: 2 Dens, created or joined.** Change it in one place:
  `den_limit_for()` in the migration. Pro means no limit.
- **Only the RevenueCat webhook sets `is_pro`.** Users can't, even on their own
  row — column grants block it. The app must call
  `Purchases.logIn(supabaseUserId)` after sign-in so purchases map to a user.
- **Sign-in is by emailed code**, not Sign in with Apple, which needs the paid
  Apple Developer Program.
- **The service role key never goes in the app.** It bypasses every rule here.
  `createRuckus()` refuses it.

## RevenueCat webhook setup

RevenueCat dashboard → Project settings → Integrations → Webhooks:

- URL: `https://<proxy-domain>/webhooks/revenuecat`
- Authorization header: the value of `REVENUECAT_WEBHOOK_AUTH` from `.env`,
  including the word `Bearer`

The same value, plus `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, must be
set as variables on Railway.
