# Frontend tasks — Amelia and Quan

The app is merged and wired to the real backend through `src/api/ruckus.ts`, but
that adapter has **never run against the live Supabase project**. Task 0 is doing
that. Everything after it is ordered by what the demo needs.

Split between you however suits you. Tasks 3 and 4 need a physical iPhone and a
dev build; the rest work in the simulator.

## Before you start

- `npm install` at the repo root, then `npm run mobile` / `npm run typecheck:mobile`.
- Keys live in **one `.env` at the repo root** (Karthik sends it, not over chat).
  `apps/mobile/.env` is a link to it, created when you first run the app; delete
  any old `apps/mobile/.env` of your own. The app uses the four `EXPO_PUBLIC_`
  lines — anything with that prefix is readable by anyone who downloads the app.
- Error handling: every backend failure is a `RuckusError`. Match on `e.code`,
  show `e.message`, and `e.needsUpgrade === true` means show the paywall. Full
  list in `supabase/README.md`.

---

## Task 0 — First real run *(do this first)*

Nothing below is trustworthy until this works end to end.

1. Fill `apps/mobile/.env`; the app switches from the mock to the real adapter.
2. Sign in with a real email. **Check with Karthik first** that Supabase is set to
   send a **6-digit code**, not a link — by default it sends a link, and the app
   has nowhere to put it.
3. Make a Den, get its code, join it from a second account.
4. Paste a reel link (until the share extension exists) → confirm → save → the
   pin appears on the other account's map without a refresh.
5. Write down every place it breaks. Backend problems go to Shruthi/Karthik with
   the `e.code` and what you did.

## Task 1 — Route the confirm screen on `mode`, not on confidence

**Bug.** `ConfirmScreen.tsx` decides "one result or three" from
`list[0].confidence >= CONFIDENT`. That ignores the `mode` the pipeline returns —
so when two places both score high (two cafés named in one reel), the pipeline
says `'choose'` and the screen still shows only the first.

**Do:** pass `mode` from `resolveSharedUrl` into the screen and route on it:
`single` → one card + "Not right?", `choose` → three, `search` → the search box,
`multi` → Task 2. Drop the confidence comparison.

The score cut-offs changed on 27 Sept after hand-checking 70 places: most reels
now come back `single`, and every one of those had the right pin. Trusting `mode`
is what makes that show up as one tap.

## Task 2 — Pick several places (itinerary reels)

**Why:** travel reels return up to 8 places ("48 hours in Banff"). The adapter
currently downgrades `multi` to "pick one", so the user loses the other seven.
**It isn't in the Figma yet** — agree a design between you first.

**Behaviour:** a list of all candidates with checkboxes, all ticked by default
except `tier: 'low'` ones; one "Add N to Stash" button.

**Backend is ready:** `ruckus.stash.save({ denId, places: [...ticked], sourceUrl })`
takes up to 20 in one call. Then
`ruckus.confirmations.log({ mode: 'multi', offered: candidates, chosen: tickedIndexes })`.
Events come with `when.text` ("September 18–20") — worth showing on the row.

`saveToStash` in the `Api` interface takes one place; widen it to a list.

## Task 3 — RevenueCat and the paywall *(mostly done — Amelia)*

Already in the app (`src/billing/purchases.ts`): RevenueCat configured from
`EXPO_PUBLIC_REVENUECAT_KEY`, `Purchases.logIn(userId)` after sign-in, the
paywall and Customer Center, entitlement **`ruckus_pro`**. What's left:

1. **The webhook has to live in Amelia's RevenueCat project**, not Karthik's —
   it's how the server learns someone is Pro and lifts the Den limit. Karthik
   sets it up (add him as a collaborator), then "Send test event" should return 200.
2. Open the paywall whenever `e.needsUpgrade` is true (creating or joining a 3rd
   Den), not only from the People row.
3. After a purchase the app knows instantly; the server finds out by webhook a
   few seconds later. If a Den action fails with `den_limit_reached` right after
   buying, wait a moment and retry once before showing an error.
4. Test on a device: buy in the Test Store, then create a 3rd Den.

## Task 4 — Share extension and dev build

- `npx expo run:ios` builds the dev client. Share-from-Instagram only works on a
  **physical iPhone** — the simulator has no Instagram.
- A config plugin such as `expo-share-intent` keeps `ios/` generated (it's
  gitignored — don't commit it).
- App Group entitlement on both targets with an **identical** string, or the
  extension can't hand the URL to the app.
- A free Apple ID works; the install expires every 7 days, so rebuild before
  recording the demo.
- When a URL arrives: `resolveSharedUrl(url)` → confirm screen. That path already
  works from a pasted link, so this task is plumbing only.

## Task 5 — Invites without a domain

The app builds `https://ruckus.app/j/CODE`, but nobody owns `ruckus.app`, and links
that open the app need the paid Apple account. So:

- Share text instead of a link: *"Join my Den on Ruckus — code 8FK2QD"*.
- Give the join screen a code field. `ruckus.dens.join(code)` already forgives
  lower case, spaces and dashes, and joining a Den you're already in is fine.
- Optional: a `ruckus://j/CODE` URL scheme — custom schemes need no paid account.

## Task 6 — Manual add (bug)

`searchPlaces` only remembers results when a reel was resolved first in the same
session. Search with no reel → pick a place → **save throws `place_missing_id`**.
Keep search results in their own cache so saving works either way. Manual entry
matters beyond convenience: it's how the app still works when a reel has no
location in it.

## Task 6b — Show the daily limit

`extractFromReel()` now returns `limited: true` when the proxy refused because the
user hit today's cap (100 reels a day). The offline guesser still runs, so there
may be candidates — but say *"You've hit today's limit, so these are rougher
than usual"* rather than letting them look like a bad guess.

## Task 7 — Switch Den

"Switch Den" is a no-op and the app always uses `dens.mine()[0]`. Add a picker;
`dens.mine()` returns every Den with member counts and your role. Needed to show
the paywall doing anything, since Pro sells "unlimited Dens".

## New backend pieces

| When | `den_stash` row gains | You do |
| --- | --- | --- |
| **Done** | `wanters: [{ id, displayName, avatar }]` | already wired: `interested = wanters.map(w => w.id)` |
| **Done** | `takes: [{ userId, text, at }]` on every row; `ruckus.takes.set` / `remove` | already wired in `ruckus.ts` — comments persist now. Show `take_empty` / `take_too_long` inline |

One take per person per place — `set` adds or replaces yours. Add the new fields
to `src/types/ruckus-packages.d.ts` as they land.

---

## Order

**0 → 1 → 3 → 4 → 2 → 5 → 6 → 7.** Tasks 0, 3 and 4 are what the entry can't
ship without: a working app, on a real phone, with RevenueCat in it — and 3 is
mostly done already.

## The demo video

Under 2 minutes, recorded on a real iPhone, public on YouTube or Vimeo. The
story that sells it: share a reel from Instagram → "Think I found it" → one tap
→ the pin drops → a friend's phone shows it live → they tap "I'm in". Shruthi's
seed script fills the map so it doesn't open empty.
