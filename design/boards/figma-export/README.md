# Ruckus — Figma handoff

`ruckus-all-screens.html` is every board in a single self-contained document:
no relative paths, every image inlined, fonts pulled from Google Fonts. 26
boards, including static versions of the two interactive prototypes.

To turn it into Figma layers:

    cd design/boards/figma-export
    npx serve . -p 4000          # or: python3 -m http.server 4000

Figma → Plugins → **html.to.design** → paste `http://localhost:4000/ruckus-all-screens.html`.
One import, one page, every screen as editable frames and text.

To regenerate after editing the boards:

    node design/boards/src/build.mjs     # writes the .dc.html boards + canvas.json into design/
    node design/boards/src/combine.mjs   # writes this folder's ruckus-all-screens.html

## Source art

`design/boards/renders/` holds the five low-poly renders at full resolution with the
transparent margins cropped off — the originals behind everything in the app.
The small `design/boards/*.png` and `ruckus/assets/critters/*.png` are downscaled from
these. Use the renders rather than pulling art out of screenshots.

## A note on the two prototypes

`Main.dc.html` (Places at the half detent) and `Confirm.dc.html` are the
interactive boards. They are templates, so outside the canvas runtime they
render their bindings as literal text. The combined file carries hand-built
static equivalents in their place.

## Type

Fredoka 600 for display, Nunito 400/500/600/700 for body, IBM Plex Mono 400/500
for kickers, hints and Rascal. All three are free on Google Fonts — install them
locally before opening the file or Figma will substitute.
