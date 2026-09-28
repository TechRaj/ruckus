# Ruckus design

How the Ruckus app looks, moves and talks, and the rules that keep it consistent.
Product and pipeline context is in `CLAUDE.md`; this file covers the interface only.

**Source of truth is the code**, in `apps/mobile/src/theme/`. Every value below is
copied from there as of 27 Sept 2026. If this file and `tokens.ts` disagree,
`tokens.ts` is right and this file needs fixing.

Source art is in `design/`: the mascot and sprite sheets in `design/sprites/`,
critter heads in `design/ruckus_headshots/`, and the sky drawings in `design/sky/`.

---

## 1. Principles

1. **Cozy, not clean.** Warm cream paper, brown ink, rounded shapes, a little
   grain. Nothing is pure white, pure black or sharp-cornered.
2. **Flare means tappable, and nothing else.** The accent colour marks things you
   can press or have selected. It is never decoration. Titles stay ink.
3. **The map never fully dies.** Even at the tallest detent a strip of map stays
   visible (`CLAUDE.md` §4).
4. **People are on every screen.** Filter chips are avatars, rows end in the
   saver's critter, the Den is a room of heads.
5. **Nothing depends on colour alone.** Category is a glyph shape, pin state is
   size and fill, each critter has its own silhouette.
6. **Day and night.** Cream by day, indigo by night. The app follows the clock
   until someone uses the switch, and then keeps their choice.
7. **Motion is optional.** Every animation has a Reduce Motion path, and the app
   works the same without it.

---

## 2. Colour

Two palettes with the same keys: `day` and `dusk`. Components import `colors` and
never pick a palette themselves.

### Structure

| Token | Day | Dusk | Use |
| --- | --- | --- | --- |
| `paper` | `#FFF9E8` | `#2B2F55` | Screen and sheet background |
| `paperSunk` | `#F7EED2` | `#222547` | Tiles, tracks, search field, comment cards |
| `hairline` | `#EBDDB8` | `#444A7D` | Borders, dividers, the sheet handle |
| `ink` | `#5B4636` | `#FFF3D1` | Titles and primary text |
| `inkSecondary` | `#7A6450` | `#D3CFEC` | Notes, secondary labels |
| `inkMuted` | `#86725D` | `#AAA8D4` | Kickers, hints, meta, inactive icons |
| `warn` | `#C2553D` | `#FFA48F` | Errors and warnings |
| `scrim` | `rgba(91,70,54,0.34)` | `rgba(8,10,32,0.58)` | Behind a modal sheet |

### Flare

| Token | Day (mint) | Dusk (lilac) | Use |
| --- | --- | --- | --- |
| `flare` | `#ACE1AF` | `#CBBBF3` | Primary buttons, selected chips, selected pin, active tab |
| `flareDeep` | `#7DBF81` | `#9684D6` | The solid edge under a flare button, selected borders |
| `onFlare` | `#24472A` | `#2A2258` | Text and icons on flare |
| `flareWash` | `#E4F5E4` | `#453F7A` | Selected list row |

Text on flare is always `onFlare`, never `ink`. Ink turns cream at night and
disappears on lilac.

### Pastels

For identity only: Den emblems and the mascot's name tag.

| Token | Day | Dusk |
| --- | --- | --- |
| `butter` | `#FFE08A` | `#FFE08A` |
| `butterWash` | `#FFF1C4` | `#4A4568` |
| `peach` | `#FFC2AD` | `#E8A08F` |
| `sky` | `#BFE8F7` | `#5B73B8` |
| `lilac` | `#D9C8F5` | `#8275C4` |
| `pink` | `#FBC4D6` | `#C47B9F` |

### Pins and map

| Token | Day | Dusk | Use |
| --- | --- | --- | --- |
| `pin` | `#FFF9E8` | `#FFF3D1` | Pin fill at rest |
| `pinInk` | `#5B4636` | `#2B2F55` | Pin outline and glyph |
| `pinDim` | `#A9C79A` | `#6F7AA8` | The dot a filtered-out pin shrinks to |

The `map*` tokens (`mapLand`, `mapWater`, `mapParks`, `mapRoads`, `mapLot`,
`mapLabel`) describe a custom map style that is not built. Apple Maps ignores
them and only switches light or dark. `mapWater` is used today as the soft glow
behind the critter room and the Saved screen.

### Day and night

- Night runs from 8pm to 5am, until the theme switch is used. After that the
  chosen mode stays, whatever the time.
- The switch is at the top of every tab: moon on the left, sun on the right.
  Tapping it reloads the app into the other palette, which takes about a second.
- Sign-in and onboarding are always day.
- The palette is chosen once when the app loads, because styles read `colors` at
  load time. Crossing dusk or dawn reloads the app the next time it comes to the
  foreground with no sheet open. The palette never changes under an open screen.

### The sky card

Home's greeting card is a hand-drawn sky. There are four drawings, and the card
picks one from the time of day. It follows the clock and not the theme switch,
so day mode after dark still shows the night sky.

| Mood | Hours | Greeting colour |
| --- | --- | --- |
| morning | 5am to 10am | `#4A3B2E` |
| day | 10am to 5pm | `#4A3B2E` |
| evening | 5pm to 8pm | `#4A3B2E` |
| night | 8pm to 5am | `#FFF3D1` |

The sun or moon is a separate image that moves along an arc with the time. A
cut-out of the hills is drawn over it, so it rises and sets behind them.

Source art is in `design/sky/`. The app's copies are in
`apps/mobile/assets/sky/`.

### Contrast

Measured against WCAG AA (4.5:1 for body text, 3:1 for large text and controls).

| Pair | Day | Dusk |
| --- | --- | --- |
| `ink` on `paper` | 8.4 | 11.6 |
| `inkSecondary` on `paper` | 5.3 | 8.5 |
| `onFlare` on `flare` | 7.0 | 8.1 |
| `inkMuted` on `paper` | **4.4** | 5.7 |
| `inkMuted` on `paperSunk` | **4.0** | 6.5 |
| `inkMuted` on `flareWash` | **4.0** | **4.1** |
| `warn` on `paper` | **4.3** | 6.7 |

The bold values fall short of 4.5:1. `inkMuted` carries 12–13px text (kickers,
hints, meta), which does not count as large text, so day-mode muted text is
slightly under AA. See §10.

---

## 3. Type

Two families: **Baloo 2** for anything with personality, **Nunito** for reading.

| Style | Font | Size / line | Use |
| --- | --- | --- | --- |
| `display` | Baloo 2 ExtraBold | 34 / 40 | Screen titles (the tab header uses 40 / 46) |
| `displaySm` | Baloo 2 ExtraBold | 26 / 31 | Sheet titles, the stash headline |
| `rowTitle` | Baloo 2 ExtraBold | 18 / 23 | Place names in a row |
| `button` | Baloo 2 Bold | 18 | Primary button labels |
| `chip` | Baloo 2 Bold | 15 | Chips, secondary and text buttons (16) |
| `tab` | Baloo 2 Bold | 14 | Tab bar labels |
| `kicker` | Baloo 2 Bold | 12, tracked 1.7 | Uppercase label above a title |
| `progress` | Baloo 2 Bold | 13, tracked 1.5 | "SNIFFING · 64%", tabular numerals |
| `body` | Nunito Regular | 16 / 22 | Paragraphs |
| `bodyMed` | Nunito Medium | 15 / 21 | Field text, row notes (14) |
| `take` | Nunito Medium | 15 / 21 | A member's comment |
| `mascot` | Nunito Medium | 14 / 20 | Rascal's bubble, empty-state lines |
| `meta` | Nunito Medium | 13 / 17 | Neighbourhood and distance |
| `hint` | Nunito Medium | 13 / 18 | Lowercase helper text |

Rules:

- **13 is the smallest size for running text.** The exceptions are single labels:
  the kicker (12).
- **Baloo 2 clips the tops of letters** when the line height is under about 1.3×
  the font size. The 72px wordmark uses a 96px line for this reason.
- **Numbers that change use tabular numerals** (the progress label),
  so the text around them does not shift.
- `font.mono` and `font.monoRegular` are role names left over from an earlier
  design. The fonts behind them are proportional.

---

## 4. Space, shape and depth

**Spacing:** `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32.
Screen side padding is `xl` (24).

**Radius:** `lg` 20 (fields, tiles, square buttons) · `xl` 26 (cards, selected
row) · `xxl` 34 (sheet top corners) · `pill` (buttons, chips, the tab track).

**Two kinds of shadow:**

| Kind | What it is | Where |
| --- | --- | --- |
| `edge(color, depth)` | A solid offset with no blur. Gives a pressable a visible bottom edge. | Primary button (5), secondary button (4), selected chip and theme switch (3) |
| `shadow.control` / `sheet` / `critter` | Soft, brown, 10–18% opacity | Floating map controls, sheets, the selected pin |

The edge is the app's signature. Use it on things you press. Use soft shadows on
things that float over the map.

**Borders** are 1.5px `hairline` on outlined controls, and a system hairline
between list rows.

**Grain:** a 220px noise tile multiplied over surfaces at 3.5–5% opacity. It is a
static image and never receives touches.

**Glass:** one surface only, the Places sheet. An 80% paper fill over a blur
(intensity 40) with a 1px light rim, so the map shows through. Nothing else in
the app blurs. With Reduce Transparency on, it renders as opaque paper.

**Touch targets** are at least 48px. A pin at rest is 40px wide inside a 48px hit
area.

---

## 5. Layout

### Navigation

Three tabs: **Home, Places, People**. The app opens on Places. The calendar is a
sort order inside Places, not a tab.

The tab bar is 72px tall plus the home-indicator inset. Inside it sits a 60px
`paperSunk` pill track. The active tab is a flare pill with its label beside the
icon.

Every tab starts with the same header: theme switch, kicker, title.

### The Places sheet

A bottom sheet over a map that never unmounts (`@gorhom/bottom-sheet`).

| Detent | Height | What shows |
| --- | --- | --- |
| Peek | 104px | Kicker and headline, the "pull up for the list" hint, Rascal on the top edge |
| Half | 52% | Sort control, filter chips, a few rows |
| Full | 88% | Search field, the whole list |

Controls fade with the drag rather than switching at a detent: the sort control
fades out toward peek, the hint fades in at peek, the search field grows in near
full, and the map controls fade out as the sheet approaches full.

Rows are a fixed 84px. The add button is a 64px flare circle fixed in the corner.

### First launch and sign-in

| Person | Path |
| --- | --- |
| New to this device | Welcome, email and code, name and critter, Den, then the tabs |
| Has signed in here before | Sign in with email and code, then the tabs |

Signing out always returns to the sign-in screen, with the email filled in.
"I already have an account" on the welcome screen and "New here? Get started"
on the sign-in screen switch between the two paths.

### Modal sheets

Add, confirm, saved and place detail all appear in **one** modal sheet
(`SheetHost`). Moving between them resizes that sheet and cross-fades its
content. It does not close and reopen.

| Screen | Height |
| --- | --- |
| Place not found, missing event | 42% |
| Sign out | 60% |
| Confirm, while resolving | 50% |
| Add a place | 62% |
| Place detail, confirm with choices | 88% |
| Confirm with search, Saved | 90% |

The modal sheet is opaque paper with 34px top corners, a 44×5 handle and a scrim
behind it. Tapping the scrim closes it, except while a save is in progress.

---

## 6. Components

All in `apps/mobile/src/components/`.

| Component | What it is | Notes |
| --- | --- | --- |
| `PressableScale` | The base for every pressable | Scales to 0.97 on press. Haptic is `selection` for choosing, `impact` for committing, `none` for navigating |
| `PrimaryButton` | 54px flare pill with a `flareDeep` edge | Disabled and loading both drop to 55% opacity |
| `SecondaryButton` | 52px paper pill, hairline border and edge | |
| `TextButton` | 48px, label only | `muted` for the least important action |
| `RoundButton` | Square-ish paper control or round flare control | Paper floats with a soft shadow; flare has an edge |
| `Field` | Kicker label above a 56px outlined input | |
| `SortToggle` | Nearby / Date segmented control | Selected segment is a raised paper pill |
| `FilterChips` | Everyone, Today, one per member, a divider, then categories | Person and category filters apply together. Tapping a selected chip clears it |
| `PlaceRow` | Glyph tile, name, neighbourhood · distance, note, saver's critter | Selected row becomes an inset `flareWash` card without moving its content |
| `Pin` | Teardrop with a category glyph | See below |
| `CategoryGlyph` | Fork and spoon (Food), cocktail glass (Drinks), two footprints (Outdoors) | Same glyph in the pin and the row tile |
| `CritterHead` | A critter's head, drawn bare with nothing behind it | Images are square with the head centred, so every critter fills the same box |
| `CritterRoom` | A grid of labelled heads | Onboarding picker and the Den on People. Heads bob 2px |
| `Emblem` | Den crest: a pastel coin with one solid mark | lantern, acorn, moon, peak, leaf. The names are stored, so do not rename them |
| `ThemeSwitch` | Day and night switch: moon left, sun right | Saves the choice and reloads the app. Does nothing in mock mode |
| `SkyCard` | Greeting over a hand-drawn sky for the time of day | Follows the clock, not the theme. No animation |
| `TakeCard` | One member's comment | Cards enter 40ms apart |
| `EmptyState` | Paw print, one line, optional action | Use on every empty screen |
| `StashSearch` | 48px `paperSunk` pill | Visible at the full detent only |
| `MapControls` | Zoom stack and recentre | |
| `Sniffing` | Loading state while a link resolves | Counts to 92% and holds until the result arrives |
| `RascalBubble` | Speech bubble with a tilted peach name tag | |
| `Sprite` | Plays a sprite sheet | Shows the sheet's rest frame under Reduce Motion |
| `Icons` | The icon set | 24px grid, 1.9 stroke, round caps and joins |

### Pin states

| State | Size | Look |
| --- | --- | --- |
| Rest | 40px | Cream fill, ink outline and glyph |
| Selected | 52px | Flare fill, `onFlare` glyph, soft shadow |
| Dimmed | 14px | A plain `pinDim` dot, used for places the filter excludes |

A butter dot at the top right marks a place that is already in a Caper. A critter
head appears on pins only when the list is filtered to one person.

---

## 7. Motion and haptics

| Token | Value | Use |
| --- | --- | --- |
| `press` / `pressOut` | 110 / 160ms | Press-in is faster than release |
| `sheet` | 380ms | Modal sheet opening |
| sheet exit | 240ms | Exits are shorter than entrances |
| sheet resize | 260ms | Moving between screens in the sheet |
| `scrim` | 220ms | Reaches full opacity before the sheet arrives |
| `mapPan` | 320ms | Panning to a selected pin |
| entrances | 180ms, 6px rise | Bubbles and comment cards |

**Curves:** `EASE_DRAWER` (0.32, 0.72, 0, 1) for sheets. `EASE_OUT`
(0.23, 1, 0.32, 1) for everything that enters or responds to a press.

**Rules:**

- UI motion is 300ms or less. Only the sheet is longer.
- **One spring in the whole app:** Rascal's cheer on the Saved screen.
- Map animations never overshoot.
- Animate transforms and opacity. The modal sheet is full height and moved by
  transform so a resize never animates layout.
- Drag-linked effects run on the UI thread from the sheet's position.

**Press scale by size:** buttons 0.97, chips 0.95, small controls 0.94, full-width
rows 0.985. The bigger the element, the smaller the change.

**Haptics:**

| Haptic | When |
| --- | --- |
| Selection | Tapping a pin, row, chip or sort segment |
| Light impact | A press that commits: primary buttons, the add button |
| Success | A place was saved |
| None | Navigation |

**Reduce Motion** turns off press scaling, bobbing, sprites, staggered rises and
the spring. Haptics stay. The progress bar moves in 25% steps.

---

## 8. Characters

**Rascal** is the mascot, a raccoon. **Critters** are the avatars people choose.
Rascal is the guide; a critter is you.

**Critters at launch:** raccoon, possum, chipmunk, skunk. They are hand-drawn
heads with no disc behind them. Squirrel has no art, so a profile saved as
squirrel shows the chipmunk. Three more are named in the types but have no art:
pigeon, fox, crow. To add one, add the image and one line in
`theme/critters.ts`. Source art is in `design/ruckus_headshots/`.

**Where Rascal appears:**

| Place | Form |
| --- | --- |
| Onboarding welcome | Trash can sprite, standing on the Get started button below the wordmark and tagline: the can waits, squashes, pops open, he settles under the lid |
| Sign in | Standing beside the form with a slow wobble, then hopping once when the code is accepted |
| Sign out | Peeking from the can on the confirm sheet, then ducking in once signed out |
| Places, at peek | Paws resting on the sheet's top edge; fades out as the sheet rises |
| Resolving a link | Beside a speech bubble |
| Saved | Springs in with a success haptic |

**Rascal speaks in a bubble only while he is doing something**: sniffing out a
link, celebrating a save. Empty states use his line as plain text with a paw
print.

**Art still to make:** Rascal has one render. The sniff and cheer poses both use
the peek pose. A jumping sprite sheet is in `design/sprites/` and is not used in
the app yet.

Sprite source art lives in `design/sprites/`; the app's copies are in
`apps/mobile/assets/sprites/`, described in `theme/sprites.ts`.

---

## 9. Voice

All user-facing lines live in `theme/lines.ts`. Add new ones there.

- **Lowercase, short, ends with a full stop.** "nothing saved yet."
- **Say what happened, then what to do.** "couldn't find that one. try searching,
  or add it by hand."
- **No exclamation marks, no apology, no blame.**
- **Kickers are uppercase** and name the context: "YOUR SHARED STASH", "MIA'S PICKS".
- **Headlines count good ideas**, not items: "6 good ideas".
- **Buttons are sentence case and name the action**: "Add to Stash".
- **Loading lines say what is really happening**: "reading the link…", "checking
  the tagged handle…", "matching the place…".
- **Make the promise visible.** While a link resolves, the screen says "nothing
  is saved until you confirm."

**Words:** the app is Ruckus, a group is a Den, saved places are the Stash, a
planned outing is a Caper, the paid tier is Ruckus Pro. Category labels are Food,
Drinks and Outdoors.

**Never** show the Instagram name, logo or colours anywhere (`CLAUDE.md` §7).
Ruckus is a places app that accepts shared links.

---

## 10. Accessibility

Built in:

- Reduce Motion and Reduce Transparency are both honoured.
- Category, pin state and identity never depend on colour alone.
- Touch targets are 48px or more.
- Pressables carry a role, a label and a selected state. Rascal's bubble reads as
  "Rascal says: …". The critter picker uses radio roles.

Known gaps:

- **Day-mode muted text is under AA.** `inkMuted` measures 4.4:1 on paper and
  4.0:1 on `paperSunk` and `flareWash`. Darkening it to about `#7A6450` (the
  current `inkSecondary`) would pass, at the cost of the two greys merging.
- **`warn` on paper is 4.3:1** by day.
- **Dusk `inkMuted` on a selected row is 4.1:1.**
- The zoom buttons and comment Edit / Delete use plain `Pressable`, so they have
  no press feedback.
- Dynamic Type has not been tested.

---

## 11. Open design work

- **The multi-place confirm screen.** Itinerary reels return up to 8 places and
  there is no "pick which to save" design. Today they fall back to picking one.
- **Capers.** The word exists and nothing uses it.
- **Badges** (Scallywag, Ringleader, Night Owl) have no screen.
- **A styled map.** The `map*` tokens are waiting on a renderer that supports them.
- **Pin clustering**, once a Stash passes about 50 pins.
- **Rascal's sniff and cheer poses.**
