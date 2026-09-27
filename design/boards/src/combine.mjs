/**
 * One self-contained HTML file holding every artboard, for import into Figma.
 *
 * Differences from the canvas sources: no <x-dc>/<helmet> wrapper, the sprite
 * sheet is emitted once rather than per board, and every image is inlined as a
 * data URI so the file works from anywhere with no relative paths.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as K from './parts-a.mjs';
const IN = (name) => new URL(`../${name}`, import.meta.url);
const S = K.S, D = K.DISP, P = K.PLACES;

/* ---- static stand-ins for the two template boards ---- */
const stashHeader = (kick, t, sort = true) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 20px 16px;flex:none">
<div style="flex:1;min-width:0;white-space:nowrap">${K.kicker(kick)}<div style="height:6px"></div>${K.display(t, 28)}</div>${sort ? K.seg('Nearby', 'Date') : ''}</div>`;

const placesHalf = K.frame(S.land,
  K.mapSvg + K.grain(.5) + K.vignette + P.map(p => K.drop(p, p.id === 's1')).join('')
  + K.screenHeader('Toronto Shenanigans', 'Places')
  + K.mapControls
  + K.glassSheet(365, stashHeader('Your shared stash', '6 good ideas') + K.chipRow(null)
    + `<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div><div style="flex:1;overflow:hidden">`
    + P.map(p => K.listRow(p, p.id === 's1')).join('') + `</div>`)
  + `<div style="position:absolute;right:24px;bottom:107px;z-index:20;width:64px;height:64px;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(255,104,70,.34),0 2px 6px rgba(36,35,33,.14)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:block"><path d="M12 5v14M5 12h14"/></svg></div>`
  + K.tabbar('Places'));

const confirmStatic = K.frame(S.land,
  K.mapSvg + P.slice(0, 4).map(p => K.drop(p, false)).join('') + K.scrim
  + `<div style="position:absolute;left:0;right:0;top:${K.TOP}px;bottom:0;background:${S.paper};border-radius:28px 28px 0 0;box-shadow:0 -20px 44px rgba(36,35,33,.14);overflow:hidden;display:flex;flex-direction:column">
<div style="width:44px;height:5px;border-radius:3px;background:${S.hair};margin:10px auto 8px;flex:none"></div>
<div style="display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 20px;flex:none"><div style="font-size:16px;font-weight:600;color:${S.ink2}">Cancel</div><div style="font-size:15px;font-weight:700;color:${S.ink}">Confirm</div><div style="width:56px"></div></div>
<div style="flex:1;padding:12px 20px 0">
<div style="margin-bottom:10px">${K.kicker('From the link you shared')}</div>
${K.display('Think I found it', 30)}
<div style="height:20px"></div>
<div style="border:2px solid ${S.flare};background:${S.wash};border-radius:20px;padding:17px;display:flex;gap:14px;align-items:flex-start">
<div style="width:52px;height:52px;flex:none;border-radius:16px;background:${S.paper};display:flex;align-items:center;justify-content:center;color:${S.ink}"><svg width="24" height="24" viewBox="0 0 24 24" style="display:block"><use href="#g-eat"/></svg></div>
<div style="flex:1;min-width:0"><div style="font-family:${D};font-size:19px;font-weight:600;letter-spacing:-.15px;color:${S.ink}">Dual Citizen Coffee Bar</div>
<div style="font-size:14px;color:${S.ink2};margin-top:4px">930 King St W, Toronto</div>
<div style="font-size:13px;color:${S.muted};margin-top:7px">Matched from a tagged handle</div></div>
<div style="width:26px;height:26px;flex:none;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M4.5 12.6 9.5 17.5 19.5 6.8"/></svg></div></div>
<div style="height:11px"></div>
<div style="height:54px;border-radius:16px;border:1.5px solid ${S.hair};display:flex;align-items:center;justify-content:space-between;padding:0 18px;color:${S.ink2};font-size:15px;font-weight:600">Not right? See 2 other matches<span style="color:${S.muted}">${K.chevD}</span></div>
${K.textBtn('None of these — search for it', S.muted)}</div>
<div style="flex:none;border-top:1px solid ${S.hair};padding:14px 20px ${K.BOT}px">
<div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 13px">${K.kicker('Saving to')}
<div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:${S.ink}">${K.emblem('lantern', 22)}Toronto Shenanigans<span style="color:${S.muted}">${K.chevD}</span></div></div>
${K.btn('Add to Stash')}</div></div>`);

/* ---- boards, in reading order ---- */
const FROM_FILE = [
  ['PlacesPeek', 'Places · peek', 390, 844],
  [null, 'Places · half', 390, 844, placesHalf],
  ['PlacesFull', 'Places · full', 390, 844],
  ['PlacesFiltered', 'Places · filtered to Mia', 390, 844],
  ['AddPlace', 'Add a place', 390, 844],
  [null, 'Confirm', 390, 844, confirmStatic],
  ['Saved', 'Saved', 390, 844],
  ['PlaceDetail', 'Place detail', 390, 844],
  ['Home', 'Home', 390, 844],
  ['People', 'People · the Den', 390, 844],
  ['OnboardWelcome', 'Onboarding · welcome', 390, 844],
  ['OnboardCritter', 'Onboarding · you', 390, 844],
  ['OnboardDen', 'Onboarding · Den', 390, 844],
  ['AddOptionA', 'Add · A docked on the sheet', 390, 844],
  ['AddOptionB', 'Add · B header action', 390, 844],
  ['AddOptionC', 'Add · C fixed corner (shipped)', 390, 844],
  ['AddOptionD', 'Add · D raised in the nav', 390, 844],
  ['AddOptionE', 'Add · E fixed corner, morphing', 390, 844],
  ['Assets', 'Asset set', 980, 1520],
  ['PlacesEmpty', 'v1.1 · Places · empty', 390, 844],
  ['PlacesSearch', 'v1.1 · Places · searching', 390, 844],
  ['PlacesSearchEmpty', 'v1.1 · Places · nothing found', 390, 844],
  ['ConfirmSniffing', 'v1.1 · Confirm · sniffing', 390, 844],
  ['PlacesDusk', 'v1.1 · Places · dusk', 390, 844],
  ['PeopleDusk', 'v1.1 · People · dusk', 390, 844],
  ['Assets2', 'v1.1 · Asset set · tank pass', 980, 2520],
];

const strip = (file) => {
  const raw = readFileSync(IN(`${file}.dc.html`), 'utf8');
  return raw.split('</helmet>')[1].split('</x-dc>')[0];
};

const dataUri = (f) => `data:image/png;base64,${readFileSync(IN(f)).toString('base64')}`;
const IMAGES = ['critter-raccoon.png', 'critter-possum.png', 'critter-squirrel.png', 'critter-skunk.png', 'rascal-peek.png'];

let boards = '';
for (const [file, title, w, h, inline] of FROM_FILE) {
  let html = inline ?? strip(file);
  html = html.split(K.SPRITES).join('');            // sprite sheet is emitted once
  boards += `<section class="board">
  <div class="label">${title}</div>
  <div class="frame" style="width:${w}px;height:${h}px">${html}</div>
</section>\n`;
}

// every image inlined, so the file has no external dependencies
for (const img of IMAGES) {
  boards = boards.split(`src="${img}"`).join(`src="${dataUri(img)}"`);
}

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Ruckus — all screens</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..600&family=Nunito:wght@400..800&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:64px 56px;background:#EFEDE7;
       font-family:'Nunito',-apple-system,system-ui,sans-serif;color:${S.ink};}
  h1{font-family:'Fredoka',system-ui,sans-serif;font-weight:600;font-size:40px;
     letter-spacing:-.3px;margin:0 0 8px;}
  .sub{font-size:16px;color:${S.ink2};margin:0 0 52px;max-width:640px;line-height:23px;}
  .grid{display:flex;flex-wrap:wrap;gap:72px 56px;align-items:flex-start;}
  .board{display:flex;flex-direction:column;gap:14px;}
  .label{font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
         color:#8A8478;}
  .frame{background:${S.paper};border-radius:0;overflow:hidden;position:relative;
         box-shadow:0 6px 28px rgba(36,35,33,.12);}
  a{color:${S.press};text-decoration:none;}
</style>
</head>
<body>
<h1>Ruckus</h1>
<p class="sub">Every screen at 390&times;844, plus the five add-button placements, the asset
sheets, and the v1.1 tank-pass boards. Type is Fredoka 600 for display, Nunito for body, and IBM Plex Mono
for kickers, hints and Rascal &mdash; install all three before importing or they will substitute.</p>
${K.SPRITES}
<div class="grid">
${boards}</div>
</body>
</html>
`;

writeFileSync(IN('figma-export/ruckus-all-screens.html'), out);
console.log('wrote figma-export/ruckus-all-screens.html —', FROM_FILE.length, 'boards,',
  Math.round(out.length / 1024) + 'KB');
