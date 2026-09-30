# Ruckus

An iOS app for collecting places you find on Instagram Reels and turning them into plans with friends.

**Stack:** React Native (Expo, dev build — not Expo Go), iOS first.
**Last verified against Instagram:** 30 August 2026.

This file is the standing context for the project. Sections 1–4 are product; 5–7 are the ingest pipeline and its constraints; 8–10 are how to build and what's still open. Read §5 before changing anything in `src/ingest/`.

---

## 1. What Ruckus is

You see a reel of a restaurant, bar, hike, or neighbourhood. You share it to Ruckus. Ruckus works out where it is, drops a pin on your map, and makes it visible to your friend group. When enough people want to go, it becomes a plan on the calendar.

The problem: saved reels are a black hole. People save hundreds and never find them again, and there's no way to see what your friends saved for the same city.

---

## 2. Naming

**Ruckus** — decided 2 Sept 2026, overriding the earlier pick of Rascal.

The app is Ruckus; a friend group inside it is a **Den**. Confirmed against the
Figma on 2 Sept — the People screen reads "Switch Den" and the paywall reads
"Unlimited Dens". Den is the better word anyway: it is where raccoons actually
live, it pluralises cleanly, and it leaves "ruckus" free to mean the app.

| Concept | Word | Seen in design |
| --- | --- | --- |
| The app | Ruckus | — |
| A friend group | a Den | "Switch Den", "Unlimited Dens" |
| Your saved spots | the Stash | "YOUR SHARED STASH", "Add to Stash" |
| A planned outing | a Caper | not yet in any screen |
| Paid tier | Ruckus Pro | "Unlimited Dens, no ads" |
| Badge tiers | Scallywag, Ringleader, Night Owl | not yet in any screen |

Dens have names ("Toronto Shenanigans") and an emoji/crest, and are joined by a
short link — `ruckus.app/j/8FK2QD` in the design, so a six-character code and a
universal link.

Previously rejected and still rejected: Stash and Trove (fintech apps sit on
both), Gaze, Tanuki, Caper as the app name, Sly (Sly Cooper trademark risk),
Bandit, Rascal.

**Trademark — this is a real problem, not a formality.** Ruckus Networks
(CommScope) is an established Wi-Fi brand holding **class 9** registrations.
Class 9 is the software class, which makes this a materially worse conflict
than Rascal's was — Rascal's collisions were mobility scooters (class 12) and
a film estate. Two consequences:

- Sectoral distance is the whole defence: enterprise networking hardware vs a
  consumer places app. That argument is real but it is not free.
- **App Store name collision is the near-term risk**, separate from
  registration. If "Ruckus" is taken or judged confusingly similar, the listing
  name has to differ from the display name anyway.

**Action:** search US and Canadian classes 9 and 42 before anything is printed
or submitted, and pick a fallback App Store listing name now rather than during
review. This does not block building — the bundle ID and the listing name can
diverge from the display name.

---

## 3. Feature map

Ruckus is the central object, not a screen. Everything is scoped to a group — a stash, a map, a calendar, a chat all belong to one ruckus. A new user's first question isn't "what do you want to save," it's "who's this with."

**Home** — front screen widgets, reminders for upcoming saved events, suggestions. This column exists to answer *what are my friends up to*. That's the brief for the column, not a feature in it.

**Places** — map, list, and calendar collapsed into one screen (§4).

**People** — friends, messaging, temp group chats that auto-archive after the event.

**Monetisation** — designed as of the 2 Sept Figma, contrary to earlier notes
here. **Ruckus Pro: "Unlimited Dens, no ads."** Free tier (decided 28 Sept):
**3 Dens per person, 25 places per Den.** Pro lifts both. The place cap follows
the Den **owner's** Pro — a member who isn't the owner gets "ask the owner to
upgrade", not the paywall. Two consequences: the free cap has
to be at least 1 Den with a visible upgrade path, and **a Den count of exactly
one cannot be the shipped scope** — the paywall has nothing to sell if you can
never have a second Den. Entry point is a row on the People screen.

---

## 4. Core interaction pattern

A bottom sheet with detents over a persistent map, modelled on the Flighty Friends tab.

| Detent | Map | Sheet |
| --- | --- | --- |
| Peek | dominant | one summary line |
| Half | visible | filter chips + a few rows |
| Full | a sliver | full scrollable list |

**The map never fully dies.** Even at full extension a sliver stays visible — it keeps spatial context alive and gives an obvious tap target to collapse.

**Filter chips are avatars.** Everyone / Today / one chip per friend. Filtering by person is a more natural gesture than by category, and it puts the social layer on every screen.

**Selection syncs both ways.** Tapping a pin scrolls the sheet to that row; tapping a row pans the map and pops the pin. This is the real engineering cost of the pattern and the thing that feels broken if half-built. Use one shared selection state that both the map and the list observe.

**Use the platform sheet.** `@gorhom/bottom-sheet` (Reanimated, runs on the UI thread). Rolling custom drag physics is a multi-week detour that ends up feeling wrong.

**Calendar is a sort order, not a tab.** A segmented control in the sheet header — sort by distance or by date. Keeps the nav bar to three destinations.

---

## 5. The ingest pipeline

### 5.1 What Instagram actually gives you

Tested 30 Aug 2026 against live public reels, logged out, no cookies, no token. **Re-test before assuming any of this still holds.**

A logged-out reel page returns three strings and a thumbnail:

| Tag | Contents |
| --- | --- |
| `og:title` | Creator display name + caption |
| `og:description` | `N likes, M comments - handle on DATE: "CAPTION"` |
| `og:image` | Cover-frame JPEG on a public CDN |

The page is ~683KB but it's the React bundle and feature flags. **There is no post JSON in it.** Grepping for a venue handle returns hits only inside `content="..."` attributes.

Confirmed unreachable, across the main page, the crawler UA, and `/embed/captioned/`:

- **No `og:video`**, no `video_url`, no `.mp4`, no manifest. The only `video_*` keys are player telemetry flags.
- **No comments.** No `"text":` blocks at all.

Instagram serves link-preview metadata to logged-out clients and defers everything else to authenticated GraphQL.

**This is better than it sounds.** The og tags exist so links preview in iMessage and Slack — Meta has strong incentive never to break them. The GraphQL internals we can't reach are exactly what would have broken every few months.

**Consequence: no audio or video extraction.** Not a performance or bundle-size question. The iOS share sheet hands you a URL, not a file, and the video URL isn't reachable logged out. There's nothing to transcribe or OCR beyond the cover frame. Whisper, video frame OCR, and the background processing queue are all out of scope.

Also: Instagram's `robots.txt` disallows reel paths. Not binding law, but it's documented evidence of intent. It doesn't change the logged-out contract reasoning in §7, but we are not invited.

### 5.2 The flow

```
user shares reel URL
        ↓
  [ ON DEVICE ]
  1. fetch reel page   → og:title, og:description, og:image
  2. parse             → caption, creator, @handles, #hashtags, cover URL
  3. resolve handles   → fetch each profile → business display name
        ↓
  [ PROXY ]
  4. model extraction  → candidate places, kind, confidence
        ↓
  [ PROXY ]
  5. geocode           → Google Places (New) Text Search → place_id, lat/lng
        ↓
  user confirms
        ↓
  [ SERVER ]  save place_id + reel URL → stash, map, calendar
```

React Native's `fetch` goes through `NSURLSession`, so **there is no CORS**. Steps 1–3 run directly from the app. No scraper vendor, no server for the fetch.

### 5.3 Where the location actually lives

Instagram strips EXIF and GPS. There is no hidden lat/long. This is an inference problem, not a metadata-retrieval problem.

Measured across 30 reels, roughly half name the venue in prose and half only tag it. Neither path dominates — **both are required**.

1. **A tagged `@handle` that resolves to a business.** One extra fetch of `instagram.com/{handle}/` returns the display name from `og:description`. But ~20% of handles are people, not venues — the creator's second account, a friend, a photographer, or a paid sponsor. Never trust `handles[0]`.
2. **A venue name written in prose.** Usually after a 📍, often with an address.
3. **Text on the cover frame.** Reachable via `og:image`. Not yet built (§10).
4. **Hashtags.** Rarely name the venue, reliably give city and category.
5. **A creator location tag.** Often just "Toronto, Ontario". Weak hint, never truth.

Audio and comments were originally ranked here. Both are unreachable (§5.1).

### 5.4 Parsing notes

Three things that will bite:

- **The wrapper regex.** `og:description` wraps the caption in `N likes, M comments - handle on DATE: "…"`. Two known variants: posts with hidden likes drop the count prefix entirely, and viral posts abbreviate as `37K likes` / `1M likes`. Both cost a full day of confusion when hit cold. This regex and the entity decoder are the two most fragile lines in the app — **ship both as remote config** so they're fixable without an App Store release. Log `wrapperOk: false` as a production alarm.
- **HTML entities.** Captions arrive encoded: `&quot;`, `&#064;` for @, `&#x2615;&#xfe0f;` for ☕️. **React Native has no DOM** — no `DOMParser`, no textarea trick. The decoder is hand-rolled in `instagram.js`. Skip it and the handle regex silently matches nothing.
- **Dot padding.** Creators pad with `. . . .` to push hashtags below the "more" fold. Strip hashtags and padding into a separate `prose` field before extraction.
- **Emoji character classes.** `[📍🏠🗺️]` written literally pulls U+FE0F out of 🗺️ into the class, so every ☕️ matches as a pin marker. Use explicit code points: `[\u{1F4CD}\u{1F3E0}\u{1F5FA}]`. This cost a full bad results run.

### 5.5 Why the model, not heuristics

The first ranker used hand-tuned vocabulary lists — venue words, person words, sponsor names. Fitted to 20 Toronto cafés, it broke immediately on travel reels: no Skyscanner in the sponsor list, no "Tea House" in the venue list, "Dual Citizen" flagged as a person name. Every fix was a new hardcode, and it did not converge.

**Split of labour:**

| Deterministic | Model |
| --- | --- |
| fetch og tags | which candidate is the venue |
| decode entities | business vs person vs sponsor |
| resolve handles | place vs region |
| geocode | how many places the reel names |

`ranker.js` is retained as the **offline fallback** — worse, but better than a spinner that never resolves. `engine: 'heuristic'` in the response tells you which ran.

**The proxy is not optional.** An API key in an app binary is extractable in minutes, so the model call runs on a server you control (`proxy.mjs`, stateless, deploys to Railway or Fly in five minutes).

### 5.6 What crosses the device boundary

A place ID, a user ID, and — transiently — the caption, which goes to the proxy and on to the model.

**Nothing is retained.** The proxy deliberately doesn't log captions. No media ever touches our infrastructure, and we have no path to it even if we wanted one. But "no Instagram content leaves the device" is **not** true and should not be claimed.

Nothing is saved until the user taps confirm. If extraction fails or they pick "none of these," the reel leaves no trace.

**Store the reel URL, not the reel.** Pins deep-link to the original post. If the creator deletes it, the link goes dark — correct behaviour, and it avoids a takedown process.

**Do not use oEmbed to render pins inline.** oEmbed requires a Meta app token, which pulls us under Meta Platform Terms and into Meta App Review — a review an app pitched around reels may not survive. A plain deep link costs an inline preview and removes an entire legal regime.

### 5.7 Scoring

Confidence is computed, never asked for. Two phases, both in `confidence.js`:

**Pre-geocode** — did the model's `evidence` string actually appear in the caption (a hallucination check: a made-up place can't quote real text)? Is the name written in the caption? Did a tagged handle resolve to a profile whose name matches? Is there a street address?

**Post-geocode** — the strongest signal, and free since you're geocoding anyway. Did an independent source return this place? Does the returned name match? Was it a unique hit or one of five near-identical ones (a chain, or the wrong branch)? Is it in the expected city?

Scores map to `high` / `medium` / `low` tiers, and `confirmationMode()` routes on tier and structure. Every candidate carries a `reasons` array — when a routing decision looks wrong, read it rather than guessing.

### 5.8 The confirmation step

Three reasons, ascending in importance:

- **Accuracy.** The ranker won't be confident. Converting ranking into recognition is right; humans recognise better than they recall.
- **Legal.** If the server auto-writes what the model guessed, the record was created by our pipeline. If the user picks, it was created by a person who watched the reel and made a judgment. That distinction does real work in the "are you a scraper" question, and it costs one tap.
- **Training data.** Every confirmation is a labelled example. "None of these" is the most valuable signal in the app.

**Modes** (`confirmationMode()` in `extract-llm.js`): `single` (clear winner, "not right?" link), `choose` (three options), `multi` (itinerary reel — pick which to save), `search` (city pre-filled).

Log which position the user picks. If it's #1 ninety percent of the time, raise the threshold and remove a tap.

---

## 6. Measured results

Three runs over the same URL set, `harness.mjs` → `results.csv`.

| Run | Ranker | Reels with a place | Wrapper OK | Notes |
| --- | --- | --- | --- | --- |
| 1 | heuristic, handle-first | 85% | 80% | 2/9 handles resolved to people |
| 2 | heuristic, scored | — | 67% | emoji bug produced sentence fragments |
| 3 | Haiku 4.5 | **93%** | **98%** | all prior failures correct |

**Run 3 outstanding issues:**

- **Model confidence was removed entirely.** Nearly every place returned 0.95 across 94 rows. A model's stated confidence is not a measurement, and the Messages API doesn't expose logprobs. Replaced with `confidence.js` — a deterministic score over verifiable facts (see §5.7). The model no longer rates itself.
- **One reel returned 27 places** (a 10-day road trip). Prompt now caps at 8, ordered by prominence.
- **`kind` drifted** — the model invented `activity` beyond the five allowed values, and classified Lake Louise as `region` in one reel and `venue` in another. Matters because regions geocode to areas, not businesses.
- ~~**City format is inconsistent**~~ — handled by `normaliseCity()` in
  `geocode.js`. Two things it fixed, both measured: the city suffix is only
  appended for venues (for a region, "Lake Louise" + "Banff" returned *Banff
  National Park*), and the province and the words "National Park" are stripped.
- **2 of 29 reels return no og tags at all**, consistently across all three runs. Deleted, private, or age-gated. That's the floor — roughly 7%.

---

## 7. Legal and platform constraints

*Not legal advice. A lawyer needs to review before launch.*

**CFAA (US).** hiQ v. LinkedIn (9th Cir. 2022): scraping publicly accessible data isn't unauthorized access. It still bites when scraping circumvents access controls, including scraping behind a login. Canada criminalises authentication bypass under Criminal Code s.342.1. **Ruckus never authenticates** — no bot accounts, no session cookies, no logged-in WebView. Hard architectural line.

**Breach of contract — the real risk.** Meta lost the CFAA framing against Bright Data, and the contract reasoning turned largely on *logged-out* access, where browsewrap terms are weakly enforceable. Once you create an account and click through terms, that's clickwrap and it holds. We read three public meta tags, logged out, on a page the user explicitly chose to share — the same operation every link preview performs.

**Meta Platform Terms.** Binds the moment you touch the Meta API. **We don't** — no oEmbed, no Graph API, no token, no App Review. The deep-link decision (§5.6) is what keeps it that way.

**Privacy — PIPEDA, Quebec Law 25, GDPR.** GDPR applies to public data; posts containing usernames trigger obligations. Location tied to a person is sensitive. The Art. 14 notice requirement is what repeatedly caught Clearview AI. **Mitigation is data minimisation as architecture** — we store a place ID and a reel URL, build no creator profiles, retain no captions, accumulate no corpus.

**Copyright.** Facts aren't copyrightable, so extracting "this is Dual Citizen" is fine. Caching the video, thumbnail, or caption is reproduction. **Discard captions after extraction** and **never re-host `og:image`** — OCR in memory, drop it. DMCA §1201 covers circumventing technical measures; we defeat none — no rate-limit evasion, no anti-bot circumvention, no proxy rotation.

**App Store Review — the most likely blocker.** Guidelines 5.2.1 (third-party IP) and 4.2. Reviewers pattern-match hard on Instagram-adjacent utilities. Mitigations, all of which are also just true:
- Ruckus is a **places app that accepts shared links**, not an Instagram extractor. Name, subtitle, keywords, description all say so.
- No Instagram wordmark, glyph, or colours anywhere.
- **Support other sources at launch** — pasted addresses, TikTok, manual entry. Single-source looks like an unofficial client.

**Platform risk beats legal risk.** Meta can ban an app on a Tuesday with no court involved. The share-sheet architecture survives that — if the og tags close, we fall back to manual entry and the app still works.

---

## 8. Repo layout

```
CLAUDE.md                       this file - standing context
packages/ingest/                @ruckus/ingest - the whole pipeline, no UI
  src/index.js                  extractFromReel() - owns the orchestration
  src/instagram.js              fetch + parse og tags, decode entities, resolve handles
  src/extract-llm.js            model extraction  <- primary
  src/geocode.js                candidates -> place_id, coords, address
  src/confidence.js             deterministic scoring + confirmationMode
  src/ranker.js                 heuristic fallback, offline only
apps/proxy/proxy.mjs            model proxy, keeps the key off the device
apps/mobile/                    Expo dev build (not yet scaffolded)
tools/harness/harness.mjs       batch-test over urls.txt
tools/harness/urls.txt          30 reels: Toronto cafes + travel/itinerary
tools/harness/results/          one CSV per model run
```

**Layering rule.** `instagram.js` fetches and parses; it must never import a
ranker. `index.js` is the only file that decides what the user sees. The app
imports `@ruckus/ingest` and nothing below it.

**The measurement loop:** edit `extract-llm.js` or the prompt → `npm run proxy` in one terminal, `npm run harness` in another → read `tools/harness/results/` → fill `correct?` → repeat. The harness imports `@ruckus/ingest`, so a fix there is a fix in the app.

**The loop was closed on 27 Sept.** 70 places from the 30-reel corpus were
checked by hand against the reels: **67 correct, 3 partial, 0 wrong.** The
model's extraction is not the weak point. The pin is — and the score separates
right pins from wrong ones cleanly:

| Tier | Score | Places | Pins |
| --- | --- | --- | --- |
| high | 10+ | 61 | all right |
| medium | 7–9 | 4 | all right |
| low | below 7 | 5 | all wrong (Bow Lake → Bow Glacier Falls) |

Thresholds in `confidence.js` are set from this. The labels judge what the model
read, not where Google pinned it — keep that distinction when re-labelling. The
next measurement comes free from real users: `confirmations` records which option
people pick (§5.8).

---

## 9. Build order

Per the original plan, unchanged: **the map with a working sheet, the share extension, and the confirmation step.** That's the whole product in miniature and it tests the only assumption that matters — whether people will share reels into a second app.

The ingest tier is small: two HTTP requests, a regex, an entity decoder, one model call. It fits inside the share extension and returns in about two seconds, so there's no background queue and no "we'll have it ready in a minute" state.

**Parallel tracks.** Frontend builds the map and sheet against hardcoded values of this shape; ingest produces them. Agree this before splitting:

```ts
type ResolvedPlace = {
  googlePlaceId: string | null;   // primary key — dedupes across reels
  name: string;                   // Google's name, falling back to the model's
  coordinate: { lat: number; lng: number } | null;
  address: string | null;
  neighbourhood: string | null;   // list rows read "Little Italy · 1.2 km"
  city: string | null;
  kind: 'venue' | 'region' | 'event' | 'trail' | 'accommodation';
  category?: string | null;
  when: {                         // null for most saves, set for events
    text: string | null;          //   verbatim from the caption, safe to show
    start: string | null;         //   YYYY-MM-DD, only when truly resolvable
    end: string | null;
    recurring: string | null;     //   "First Wednesday of each month"
  } | null;
  headline: string | null;        // what's on there: "CHANEL cafe pop-up"; null for most
  alsoSeenAs?: string[];          // other kinds this place was returned as
  sourceUrl: string;              // the reel
  score: number;                  // confidence.js, post-geocode
  tier: 'high' | 'medium' | 'low';
  reasons: string[];              // debug: the signals that fired
  explanation: { text: string; tone: 'good' | 'warn' };  // the line under the name
};
```

`extractFromReel(url)` returns these directly — geocoding is inside the
pipeline, not the caller's job. Pass `{ geocode: false }` to stop before it,
which is only useful offline: without geocoding there is no `googlePlaceId`
and therefore nothing that can be saved.

The nullable fields are nullable on purpose. A candidate that fails to geocode
is kept, scored -5, and routed to `search` — dropping it would throw away the
name the model found.

**`when` exists because an event is a place plus a time.** Every reel in the
12 Sept holdout carried a date in the caption and all of it was being dropped.
The model resolves the year against `POSTED` from the og tags, so "August 11"
on a post from 6 Aug 2026 becomes `2026-08-11`. `text` is always safe to show;
`start`/`end` only populate when genuinely resolvable, because a wrong date on
a calendar is worse than no date. A past date shows as "Ended Sep 26" on the
confirm card, in the warn colour, before the user saves; whether to block or
hide those saves is still open.

**`headline` exists because the pin is not the reason to go.** "@chanelofficial
cafe pop up at @dineencoffeeco" pinned Dineen correctly and saved it as a plain
coffee shop. The model now writes a short title for a *happening* — pop-up,
festival, trivia night, seasonal attraction — and leaves it null for anything
still true of the place in a few months. It is model-written, never a caption
quote, so it is a fact rather than a copy (§7). When the model returns the event
and its venue as two rows, the merge in `geocode.js` keeps the event's name as
the headline. Measured 29 Sept over the 44-reel corpus + holdout: 25 headlines,
3 of them descriptions that slipped through ("newly opened", "boat cruise").

**Setup notes:**
- Expo dev build, not Expo Go — share extensions need native code. `npx expo run:ios`.
- Simulator covers everything except the share flow. Testing share-from-Instagram needs a physical device, since the simulator has no Instagram app.
- App Group entitlement on both targets, identical string, or the extension can't hand the URL to the app.
- Free Apple ID works for device testing; profiles expire after 7 days.

Friends, calendar, and messaging all assume the core loop works. Don't build them until it does.

---

## 10. Open questions

- **Multi-place reels.** `confirmMode: 'multi'` fires on itinerary reels. Does a travel reel become one save with several pins, several independent saves, or a **Caper**? The naming table already has the word and nothing uses it. This is a schema decision and it blocks the confirm screen.
- ~~**Tune the score thresholds**~~ — **done 27 Sept** from the labelled run (§8).
  Next check comes from `confirmations`: if users pick option #1 ~90% of the time
  in `choose`, lower the high line again.
- ~~**Regions vs venues.**~~ **Answered 3 Sept.** All 70 candidates from the
  full run geocoded, including all 34 regions — Moraine Lake, Peyto Lake and
  Mont Saint-Michel all return real place ids. Regions are places; treat them
  the same. What they lack is hours, ratings and a street address, which is a
  display concern, not a schema one.
- ~~**MKLocalSearch vs Google Places.**~~ **Decided: Google Places (New).**
  Its `place_id` is stable and portable, which is what makes dedup and a shared
  Stash work; MapKit's identifiers are not, and MapKit is iOS-only. The key
  lives on the proxy (`POST /geocode`, cached server-side). Map *rendering* is
  a separate, still-open choice — the data layer does not constrain it.
- **Cover-frame OCR.** `og:image` is reachable and unused. Listicle reels put their title text on frame one. Cheapest unbuilt improvement — one image fetch and a text-recognition pass.
- **Dedup and the confirm queue.** The same café will arrive from several reels; low-confidence results need somewhere that isn't the main list.
- **The withheld-location problem.** Some creators keep the location out deliberately — withholding *is* the engagement mechanic. Comments would have caught these; they're unreachable. These may simply be manual-entry cases, and that's an acceptable answer.
- **Messaging is the riskiest box on the map.** DMs mean push infrastructure, moderation, reporting, abuse handling. A "share to iMessage" button gets most of the value for none of that. Strong candidate for deferral.
- **Ad monetisation** — RevenueCat noted, placement and tier structure unspecified.
- **Trademark clearance** — Ruckus, classes 9 and 42, US and Canada. See §2: the class 9 conflict with Ruckus Networks is live, and an App Store listing fallback name is needed before submission.
