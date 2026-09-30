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
| `takes` | one line per person per place per Den | members |
| `capers` / `caper_going` | a plan: one place, one day, who's going | members |
| `device_push_tokens` | Expo push tokens, one row per device | only you |
| `event_reminder_sends` | one row per reminder attempt, no token | only you, for your own alerts |
| `confirmations` | what the confirm screen offered and what was picked (§5.8) | only you |
| `blocks` | who you've blocked; their comments are hidden from you | only you |
| `reports` | a reported person or comment, with the comment as it read | nobody in the app — the dashboard only |

Writes go through functions, so the rules that RLS can't express are enforced in one place:

| Function | `@ruckus/api` | Enforces |
| --- | --- | --- |
| `create_den` | `dens.create` | the free-tier Den limit (3) |
| `create_invite` | `dens.invite` | members only; reuses the live code |
| `join_den` | `dens.join` | expiry, max uses, the Den limit; idempotent |
| `leave_den` | `dens.leave` | hands ownership on; deletes an empty Den |
| `save_places` | `stash.save` | membership; upserts the place; keeps event dates; 25 places per free Den |
| `den_stash` | `stash.list` | membership; one row per place, with distance and who wants to go |
| `set_want_to_go` | `stash.setWant` | membership |
| `make_caper` | `capers.make` | membership; the place is in the Stash; one Caper per place per day; "going" is filtered to Den members |
| `set_take` | `takes.set` | membership; the place is in this Den's Stash; 1–280 chars; replaces yours |
| `delete_take` | `takes.remove` | membership; only ever your own; no error if you had none |
| `register_push_token` | `notifications.registerPushToken` | the signed-in user; a token moves to the account that registers it |
| `unregister_push_token` | `notifications.unregisterPushToken` | your own token |
| `log_confirmation` | `confirmations.log` | strips captions and `evidence` before storing |
| `block_user` / `unblock_user` | `safety.block` / `unblock` | only someone you share a Den with; not yourself |
| `blocked_people` | `safety.blocked` | your list, with names, even after you stop sharing a Den |
| `report` | `safety.report` | you and they are in the Den; a comment report keeps the text |
| `delete_my_account` | `auth.deleteAccount` | your saves go like `remove_from_stash`; you leave every Den; then the login and everything keyed to it |

## Errors the app should handle

Raised with a stable key. `@ruckus/api` turns each into a `RuckusError` with
`.code` set to the key and a readable `.message`. Match on `.code`.

| `code` | Show |
| --- | --- |
| `den_limit_reached` | the **Ruckus Pro paywall** (`error.needsUpgrade` is `true`) |
| `place_limit_reached` | the **paywall** — you own the Den and it has 25 places |
| `den_full` | *"Ask its owner to upgrade"* — the Den is full and it isn't yours, so buying Pro wouldn't help |
| `invite_invalid` / `invite_expired` / `invite_used_up` | the join screen, with the message |
| `not_a_member` | usually a stale Den id — go back to the Den list |
| `place_missing_id` | route to search: the pipeline couldn't pin it |
| `not_signed_in` | the sign-in screen |
| `take_empty` / `take_too_long` | inline under the comment box |
| `cannot_block_self` / `cannot_report_self` / `take_missing` | the message; the menus don't offer these, so seeing one is a bug |

## Rules worth knowing

- **Free tier: 3 Dens per person (created or joined), 25 places per Den.**
  Pro lifts both. The place cap follows the Den **owner's** Pro, not the saver's.
  Change the numbers in `den_limit_for()` and `den_place_limit()`
  (`20260928150000_free_tier_limits.sql`). `dens.capacity(denId)` returns
  `{ places, placeLimit, iOwnIt }` for a "18 of 25" display.
- **Only the RevenueCat webhook sets `is_pro`.** Users can't, even on their own
  row — column grants block it. The app must call
  `Purchases.logIn(supabaseUserId)` after sign-in so purchases map to a user.
- **Sign-in is by emailed code**, not Sign in with Apple, which needs the paid
  Apple Developer Program.
- **The service role key never goes in the app.** It bypasses every rule here.
  `createRuckus()` refuses it.

## Reports (App Store guideline 1.2)

Apple expects reports acted on within 24 hours, and the terms promise it.
Check open ones daily in the SQL editor:

```sql
select r.created_at, r.kind, r.body, r.reason, p.display_name as reported, d.name as den
from reports r left join profiles p on p.id = r.reported_id left join dens d on d.id = r.den_id
where resolved_at is null order by created_at;
```

To remove a comment: `delete from takes where den_id = … and place_id = … and profile_id = …`.
To remove a person: `select delete_account('<profile id>');`, the same thing
the app's Delete account does. Don't delete them in Authentication → Users, which
leaves their saves in the Stash with no name. Then
`update reports set resolved_at = now(), resolution = '…' where id = …`.

## Event reminders

A dated save (`when_start`, one agreed date, and a place time zone) reminds
every current member who has a device, at **09:00 in that time zone**, 7, 3,
and 1 calendar days before the date. A Caper that has a time ("6:45 pm")
uses that time of day instead, exactly 7, 3, and 1 days before, and the
alert stops once that time on the day itself has passed. Want-to-go is read
when the alert is sent. The proxy runs that job itself every 10 minutes
while it is up. `POST /internal/reminders/dispatch` is the same job, with
header `x-ruckus-key: $PROXY_SECRET`, if you also want an outside cron. It
needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PROXY_SECRET` on the
proxy. An optional `EXPO_ACCESS_TOKEN` is sent with the Expo push call.

Dashboard steps that are not in the repo:

1. [expo.dev](https://expo.dev) → create the project and put its id in
   `apps/mobile/app.json` as `extra.eas.projectId`.
2. Upload an APNs key (Apple Developer) and FCM credentials (EAS) for the
   bundle. Remote push does not work in Expo Go on Android.
3. Apply the migration (`npm run db:push`).
4. Point a cron at the dispatch URL above.

## RevenueCat setup

Pro is decided by asking RevenueCat whether the user has `ruckus_pro` active —
not from the webhook event's type — so a lapsed monthly can't remove a lifetime
purchase, and a restore onto another account (`TRANSFER`) updates both. That
needs `REVENUECAT_SECRET_KEY` on Railway (`/health` says `"pro": "verified"`).
The app also calls `/pro/sync` right after buying, so nobody waits on the webhook.

### Webhook

RevenueCat dashboard → Project settings → Integrations → Webhooks:

- URL: `https://<proxy-domain>/webhooks/revenuecat`
- Authorization header: the value of `REVENUECAT_WEBHOOK_AUTH` from `.env`,
  including the word `Bearer`

The same value, plus `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, must be
set as variables on Railway.
