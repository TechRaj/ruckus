import { writeFileSync } from 'node:fs';
import * as K from './parts-a.mjs';
/* Boards, canvas.json and the small PNGs live one level up, next to each other, so the canvas resolves them. */
const OUT = (name) => new URL(`../${name}`, import.meta.url);
import { MAIN } from './interactive.mjs';
import { CONFIRM } from './confirm.mjs';
import { A as OptA, B as OptB, C as OptC, Dopt as OptD, E as OptE } from './addoptions.mjs';
const S = K.S, F = K.FONT, D = K.DISP, P = K.PLACES;
const files = {};
const byId = (id) => P.find(p => p.id === id);
const stack = (people, ring, size=32) => `<div style="display:flex;flex:none">${people.map((p,i)=>`<div style="margin-left:${i?-13:0}px">${K.av(p,size)}</div>`).join('')}</div>`;

files['Main.dc.html'] = MAIN;
files['Confirm.dc.html'] = CONFIRM;
files['AddOptionA.dc.html'] = OptA;
files['AddOptionB.dc.html'] = OptB;
files['AddOptionC.dc.html'] = OptC;
files['AddOptionD.dc.html'] = OptD;
files['AddOptionE.dc.html'] = OptE;

const stashHeader = (kick, t, sort=true) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 20px 16px;flex:none">
<div style="flex:1;min-width:0;white-space:nowrap">${K.kicker(kick)}<div style="height:6px"></div>${K.display(t, 28)}</div>${sort?K.seg('Nearby','Date'):''}</div>`;

/* the map with its atmosphere — grain and a vignette sit between the basemap and the pins */
const mapAtmos = K.mapSvg + K.grain(.5) + K.vignette;
const rule = `<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div>`;
const pawHint = (t, pad='30px 24px') => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:${pad}">${K.pawPrint(S.hair,30)}${K.hint(t,'text-align:center')}</div>`;

/* ---- Places · peek, Rascal over the sheet edge ---- */
files['PlacesPeek.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos + P.map(p => K.drop(p, p.id==='s1')).join('') +
  K.screenHeader('Toronto Shenanigans','Places') + K.mapControls +
  K.glassSheet(624, stashHeader('Your shared stash','6 good ideas', false) +
    `<div style="padding:0 20px">${K.hint('pull up for the list')}</div>`) +
  `<div style="position:absolute;left:250px;top:534px;z-index:3">${K.rascal(112)}</div>` +
  K.tabbar('Places')));

/* ---- Places · full ---- */
files['PlacesFull.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos + K.drop({...byId('s6'), y:66}, false) +
  K.glassSheet(91, stashHeader('Your shared stash','6 good ideas') + K.chipRow(null) + K.searchField() +
    rule + `<div style="flex:1;overflow:hidden">` +
    P.map(p => K.listRow(p, false)).join('') +
    pawHint("that's the whole stash.", '30px 0') + `</div>`) +
  K.tabbar('Places')));

/* ---- Places · filtered to one person (§12.2) ---- */
const mias = P.filter(p => p.by === 'mia');
files['PlacesFiltered.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos + P.map(p => p.by==='mia' ? K.dropAv(p) : K.dropDot(p)).join('') +
  K.screenHeader('Toronto Shenanigans','Places') + K.mapControls +
  K.glassSheet(365, stashHeader("Mia's picks",'2 good ideas') + K.chipRow('mia') +
    rule + `<div style="flex:1;overflow:hidden">` +
    mias.map(p => K.listRow(p, false)).join('') +
    pawHint("everyone else's pins are still there. tap everyone to bring them back.") + `</div>`) +
  K.tabbar('Places')));

/* ---- Place detail ---- */
files['PlaceDetail.dc.html'] = K.doc(K.frame(S.land,
  K.mapSvg + K.drop({...byId('s6'), y:126}, true) + K.scrim +
  K.sheet(120, `<div style="flex:1;overflow:hidden;padding:6px 20px 0">
${K.kicker('Kensington · Food')}<div style="height:8px"></div>${K.display('Grey Gardens', 34)}
<div style="font-size:14px;color:${S.muted};margin-top:6px">199 Augusta Ave · 2.0 km</div>
<div style="height:16px"></div>
${K.takeCard('josh', "Josh won't shut up about the pierogi", 'stashed it · 3d')}
<div style="height:18px"></div>${K.btn(K.icCheck + "I'm in")}
<div style="height:8px"></div><div style="text-align:center">${K.hint('add a comment')}</div>
<div style="height:20px"></div>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">${K.kicker('Comments · 2')}<div style="display:flex">${['josh','mia','zoe'].map((p,i)=>`<div style="margin-left:${i?-11:0}px">${K.av(p,26)}</div>`).join('')}</div></div>
<div style="display:flex;flex-direction:column;gap:8px">
${K.takeCard('mia', 'the beet salad is better than the pierogi', '2d')}
${K.takeCard('zoe', 'sit at the bar, the tables are a long wait', 'yesterday')}</div>
<div style="height:18px"></div>
<div style="display:flex;gap:10px">${K.btn2('Directions', K.icNav)}${K.btn2('Original post', K.icOut)}</div></div>
<div style="flex:none;padding:0 20px ${K.BOT}px">${K.textBtn('Remove from Stash', S.muted)}</div>`, 0)));

/* ---- Add a place ---- */
files['AddPlace.dc.html'] = K.doc(K.frame(S.land,
  K.mapSvg + P.map(p=>K.drop(p,false)).join('') + K.scrim +
  K.sheet(300, `<div style="flex:1;padding:6px 20px 0">
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">${K.display('Add a place', 28)}
<div style="height:38px;border-radius:19px;background:${S.sunk};display:flex;align-items:center;gap:8px;padding:0 12px 0 7px;font-size:13px;font-weight:600;color:${S.ink2};flex:none">${K.emblem('lantern',22)}Toronto Shenanigans<span style="color:${S.muted}">${K.chevD}</span></div></div>
<div style="height:20px"></div>
<div style="height:60px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};display:flex;align-items:center;gap:12px;padding:0 10px 0 16px">
<span style="color:${S.muted}">${K.icLink}</span><div style="flex:1;font-size:16px;color:${S.muted}">Paste a link</div>
<div style="height:40px;border-radius:20px;background:${S.sunk};display:flex;align-items:center;padding:0 16px;font-size:14px;font-weight:600;color:${S.ink}">Paste</div></div>
<div style="display:flex;align-items:center;gap:12px;padding:18px 0"><div style="flex:1;height:1px;background:${S.hair}"></div><div style="font-size:13px;color:${S.muted}">or</div><div style="flex:1;height:1px;background:${S.hair}"></div></div>
<div style="display:flex;flex-direction:column;gap:10px">${K.btn2('Search for a place', K.icSearch)}${K.btn2('Type in the details', K.icPen)}</div></div>
<div style="flex:none;padding:0 20px ${K.BOT+6}px;display:flex;align-items:center;gap:12px">${K.pawPrint(S.hair,28)}${K.hint('or share a link to ruckus from any app. it lands here.')}</div>`, 0)));

/* ---- Saved ---- */
files['Saved.dc.html'] = K.doc(K.frame(S.land,
  K.mapSvg + P.map(p=>K.drop(p,p.id==='s2')).join('') + K.scrim +
  K.sheet(K.TOP, K.grain(.35) + `<div style="flex:1;display:flex;flex-direction:column;padding:0 24px ${K.BOT}px;position:relative">
<div style="flex:1;position:relative">
<div style="position:absolute;left:-20%;right:-20%;bottom:0;height:46%;background:${S.water};opacity:.28;filter:blur(36px)"></div>
${[[52,120,7],[300,86,9],[262,200,6]].map(([x,y,s])=>`<div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:999px;border:1.5px solid ${S.hair}"></div>`).join('')}
<div style="position:absolute;left:0;right:0;top:200px;text-align:center;font-family:${D};font-size:56px;font-weight:600;letter-spacing:-.45px;line-height:1;color:${S.ink}">In the Stash</div>
<div style="position:absolute;left:66px;top:246px;z-index:2">${K.rascal(210)}</div>
<div style="position:absolute;left:222px;top:118px;z-index:3">${K.bubble("saved to the stash.", {w:140, tail:'bl'})}</div>
<div style="position:absolute;left:0;right:0;top:470px;font-size:16px;line-height:23px;color:${S.ink2};text-align:center;text-wrap:pretty;padding:0 24px">Dual Citizen Coffee Bar is on the map for Toronto Shenanigans.</div></div>
${K.btn('See it on the map')}${K.textBtn('Add another')}</div>`, 0)));

/* ---- Home ---- */
files['Home.dc.html'] = K.doc(K.frame(S.paper,
  `<div style="position:absolute;left:0;right:0;top:${K.TOP}px;bottom:${K.TABH}px;overflow:hidden">
<div style="padding:14px 24px 0">${K.kicker('Toronto Shenanigans')}<div style="height:6px"></div>${K.display('This week')}
<div style="height:22px"></div>
<div style="background:${S.wash};border-radius:24px;padding:20px">
<div style="display:flex;align-items:center;gap:9px"><div style="width:9px;height:9px;border-radius:999px;background:${S.flare};flex:none"></div><div style="font-size:16px;font-weight:700;letter-spacing:-.2px;color:${S.ink}">Friday might be turning into something</div></div>
<div style="height:14px"></div>
${[byId('s1'), byId('s6')].map(p=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0"><div style="flex:1;min-width:0"><div style="font-family:${D};font-size:17px;font-weight:600;letter-spacing:-.12px;color:${S.ink}">${p.name}</div><div style="font-size:13px;color:${S.ink2};margin-top:1px">${p.hood} · ${p.km}</div></div>${stack(p.going,S.wash)}</div>`).join('')}
<div style="height:16px"></div>${K.btn('Make it a Caper')}</div>
<div style="height:28px"></div>${K.kicker('Lately')}</div>
${[[byId('s1'),'6d'],[byId('s6'),'3d'],[byId('s4'),'5d']].map(([p,when])=>
`<div style="display:flex;align-items:center;gap:14px;padding:16px 24px;border-bottom:1px solid ${S.hair}">${K.av(p.by,44)}
<div style="flex:1;min-width:0"><div style="font-size:15px;color:${S.ink2}"><span style="font-weight:700;color:${S.ink}">${K.NAME[p.by]}</span> stashed <span style="font-weight:700;color:${S.ink}">${p.name}</span></div>
<div style="font-size:13px;color:${S.muted};margin-top:3px">${p.blurb}</div></div>
<div style="font-size:13px;color:${S.muted}">${when}</div></div>`).join('')}</div>` + K.tabbar('Home')));

/* ---- People ---- */
/* the room: heads float at different heights, like the tank's residents. Slots are a fixed table, not a grid */
const SAVED = { amelia:1, mia:2, josh:2, zoe:1 };
files['People.dc.html'] = K.doc(K.frame(S.paper,
  `<div style="position:absolute;left:0;right:0;top:${K.TOP}px;bottom:${K.TABH}px;overflow:hidden;padding:16px 24px 0">
${K.emblem('lantern',68)}<div style="height:16px"></div>${K.display('Toronto Shenanigans', 34)}
<div style="font-size:14px;color:${S.muted};margin-top:8px">4 people · 6 in the Stash</div>
<div style="height:18px"></div>
${K.room(['amelia','mia','josh','zoe'].map(p=>K.roomHead(K.WHO[p], K.NAME[p], SAVED[p]+' saved')).join(''))}
<div style="height:18px"></div>
<div style="background:${S.sunk};border-radius:20px;padding:16px 18px;display:flex;align-items:center;gap:12px">
<div style="flex:1">${K.kicker('Invite link')}<div style="font-size:16px;font-weight:600;color:${S.ink};margin-top:5px">ruckus.app/j/8FK2QD</div></div>
<div style="height:40px;border-radius:20px;background:${S.paper};display:flex;align-items:center;padding:0 16px;font-size:14px;font-weight:600;color:${S.ink};box-shadow:0 1px 3px rgba(36,35,33,.10)">Copy</div></div>
<div style="height:12px"></div>${K.btn('Share invite')}<div style="height:26px"></div>
<div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:20px;border:1.5px solid ${S.hair}">${K.emblem('moon',32)}
<div style="flex:1"><div style="font-size:16px;font-weight:700;color:${S.ink}">Ruckus Pro</div><div style="font-size:13px;color:${S.muted};margin-top:2px">Unlimited Dens, no ads</div></div><span style="color:${S.muted}">${K.chevR}</span></div>
<div style="height:8px"></div>${K.textBtn('Switch Den', S.muted)}</div>` + K.tabbar('People')));

/* ---- Onboarding ---- */
files['OnboardWelcome.dc.html'] = K.doc(K.frame(S.paper,
  `<div style="position:absolute;inset:${K.TOP}px 24px ${K.BOT}px;display:flex;flex-direction:column">
<div style="flex:1;position:relative">
<div style="position:absolute;left:-40px;right:-40px;bottom:40px;height:40%;background:${S.water};opacity:.3;filter:blur(40px)"></div>
<div style="position:absolute;left:0;top:96px">${K.kicker('A places app for friends')}</div>
<div style="position:absolute;left:-2px;top:122px;font-family:${D};font-size:72px;font-weight:600;letter-spacing:-.6px;line-height:1;color:${S.ink}">Ruckus</div>
<div style="position:absolute;left:0;top:182px;z-index:2">${K.rascal(200)}</div>
<div style="position:absolute;left:0;right:0;top:420px;font-size:17px;line-height:24px;color:${S.ink2};max-width:300px;text-wrap:pretty">Places worth leaving the group chat for.</div></div>
${K.btn('Get started')}<div style="height:14px"></div><div style="text-align:center">${K.hint('already in a den? join with a link')}</div><div style="height:14px"></div></div>`));

files['OnboardCritter.dc.html'] = K.doc(K.frame(S.paper,
  `<div style="position:absolute;inset:${K.TOP}px 24px ${K.BOT}px;display:flex;flex-direction:column">
<div style="width:44px;height:44px;margin-left:-11px;display:flex;align-items:center;color:${S.ink2}">${K.chevL}</div>
<div style="height:10px"></div>${K.display('Set yourself up', 34)}
<div style="font-size:16px;line-height:22px;color:${S.muted};margin-top:10px;text-wrap:pretty">This is how you'll show up on the map and in your Den.</div>
<div style="height:22px"></div>${K.field('Your name','Amelia')}<div style="height:20px"></div>
<div style="margin-bottom:10px">${K.kicker('Your critter')}</div>
${K.room(['raccoon','possum','squirrel','skunk'].map(n=>K.roomHead(n, n, '', n==='raccoon')).join(''))}
<div style="flex:1"></div>${K.btn("That's me")}</div>`));

const emblemPick = (k, on) => `<div style="width:58px;height:58px;flex:none;border-radius:20px;border:1.5px solid ${on?S.flare:S.hair};background:${on?S.wash:S.paper};display:flex;align-items:center;justify-content:center">${K.emblem(k,32)}</div>`;
files['OnboardDen.dc.html'] = K.doc(K.frame(S.paper,
  `<div style="position:absolute;inset:${K.TOP}px 24px ${K.BOT}px;display:flex;flex-direction:column">
<div style="width:44px;height:44px;margin-left:-11px;display:flex;align-items:center;color:${S.ink2}">${K.chevL}</div>
<div style="height:10px"></div>${K.display("Who's this with?", 34)}
<div style="font-size:16px;line-height:22px;color:${S.muted};margin-top:10px;text-wrap:pretty">A Den is your group. Everything you save is shared with them.</div>
<div style="height:28px"></div>${K.field('Name your Den','Toronto Shenanigans')}<div style="height:24px"></div>
<div style="margin-bottom:10px">${K.kicker('Pick an emblem')}</div>
<div style="display:flex;gap:12px">${['lantern','acorn','moon','peak','leaf'].map((k,i)=>emblemPick(k,!i)).join('')}</div>
<div style="flex:1"></div>
<div style="display:flex;align-items:center;gap:12px;padding-bottom:16px">${K.pawPrint(S.hair,26)}${K.hint('you can make more dens later. one for the city, one for the road trip.')}</div>
${K.btn('Create the Den')}${K.textBtn('I have an invite link instead')}</div>`));

/* ===== v1.1 · tank pass — new boards ===== */

/* ---- Places · searching the stash (full detent) ---- */
const searchRows = (q, rows) => K.glassSheet(91, stashHeader('Food', rows.length + (rows.length===1?' good idea':' good ideas')) + K.chipRow(null, 'eat', 610) + K.searchField(q) + rule +
  `<div style="flex:1;overflow:hidden">` + rows.map(p => K.listRow(p, false)).join('') + `</div>`);
files['PlacesSearch.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos + K.drop({...byId('s6'), y:66}, false) +
  searchRows('pier', [byId('s6')]) + K.tabbar('Places')));

files['PlacesSearchEmpty.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos +
  K.glassSheet(91, stashHeader('Outdoors', 'nothing here') + K.chipRow(null, 'do', 720) + K.searchField('pierogi') + rule +
    `<div style="flex:1;position:relative;padding:40px 24px 0;display:flex;flex-direction:column;align-items:center;gap:16px">
${K.pawPrint(S.hair,30)}${K.hint('nothing matches "pierogi" in outdoors.', 'text-align:center;color:'+S.ink2)}</div>`) +
  K.tabbar('Places')));

/* ---- Places · empty (half detent) — the EmptyState reference ---- */
files['PlacesEmpty.dc.html'] = K.doc(K.frame(S.land,
  mapAtmos + K.screenHeader('Toronto Shenanigans','Places') + K.mapControls +
  K.glassSheet(365, stashHeader('Your shared stash', 'nothing yet', false) +
    `<div style="flex:1;position:relative;padding:12px 24px 0;display:flex;flex-direction:column;align-items:center;gap:18px">
${K.pawPrint(S.hair,34)}${K.hint('nothing saved yet.', 'text-align:center;color:'+S.ink2)}
<div style="width:100%;padding-top:6px">${K.btn('Add a place')}</div></div>`) +
  `<div style="position:absolute;left:196px;top:275px;z-index:3">${K.rascal(112)}</div>` +
  K.tabbar('Places')));

/* ---- Confirm · sniffing (static) — the loader ritual, with a number ---- */
files['ConfirmSniffing.dc.html'] = K.doc(K.frame(S.land,
  K.mapSvg + K.grain(.5) + P.slice(0,4).map(p=>K.drop(p,false)).join('') + K.scrim +
  K.sheet(K.TOP, `<div style="flex:1;display:flex;flex-direction:column;padding:6px 20px ${K.BOT}px">
${K.kicker('Add a place')}<div style="height:8px"></div>${K.display('Paste a link', 34)}
<div style="height:18px"></div>
<div style="height:60px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};display:flex;align-items:center;gap:12px;padding:0 16px"><span style="color:${S.muted}">${K.icLink}</span><div style="flex:1;font-size:16px;color:${S.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">instagram.com/reel/C8xQ2mLpR7v/</div></div>
<div style="flex:1;position:relative">
<div style="position:absolute;left:24px;top:52px;z-index:2">${K.rascal(180)}</div>
<div style="position:absolute;left:196px;top:34px;z-index:3">${K.bubble('reading the link…', {w:160, tail:'bl'})}</div>
<div style="position:absolute;left:0;right:0;top:262px">${K.mono('SNIFFING · 64%', 13, S.ink2)}<div style="height:8px"></div><div style="height:2px;border-radius:1px;background:${S.hair}"><div style="width:64%;height:2px;border-radius:1px;background:${S.flare}"></div></div></div>
<div style="position:absolute;left:0;right:0;top:310px">${K.hint("checking the tagged handle…")}</div></div>
<div style="display:flex;flex-direction:column;gap:0">
<div style="display:flex;align-items:center;justify-content:space-between;height:52px;border-top:1px solid ${S.hair};color:${S.ink2};font-size:15px;font-weight:600">Search for a place instead<span style="color:${S.muted}">${K.chevR}</span></div>
<div style="display:flex;align-items:center;justify-content:space-between;height:52px;border-top:1px solid ${S.hair};color:${S.ink2};font-size:15px;font-weight:600">Type in the details<span style="color:${S.muted}">${K.chevR}</span></div></div></div>`, 0)));

/* ---- dusk twins: the tank at night. Water is the only colour that came from the tank; here it shows ---- */
files['PlacesDusk.dc.html'] = K.toDusk(files['PlacesPeek.dc.html']);
files['PeopleDusk.dc.html'] = K.toDusk(files['People.dc.html']);

/* ---- Asset set ---- */
const secLabel = (t) => `<div style="margin-bottom:20px">${K.kicker(t)}</div>`;
const cap = (t) => `<div style="font-size:12px;color:${S.muted};margin-top:12px;text-align:center;max-width:150px">${t}</div>`;
const cell = (art, label) => `<div style="display:flex;flex-direction:column;align-items:center">${art}${cap(label)}</div>`;
const swatch = (hex, name) => `<div style="width:100px"><div style="height:54px;border-radius:12px;background:${hex};border:1px solid rgba(36,35,33,.08)"></div><div style="font-size:12px;font-weight:600;color:${S.ink};margin-top:8px">${name}</div><div style="font-size:11px;color:${S.muted};font-variant-numeric:tabular-nums">${hex}</div></div>`;
files['Assets.dc.html'] = K.doc(K.frame(S.paper, `<div style="padding:42px 44px 50px">
<div style="font-family:${D};font-size:36px;font-weight:600;letter-spacing:-.3px;color:${S.ink}">Ruckus asset set</div>
<div style="font-size:15px;line-height:22px;color:${S.ink2};margin-top:10px;max-width:640px;text-wrap:pretty">Matte, faceted, one soft key light, no specular. Every critter here is a pre-rendered PNG off the same head rig — one silhouette, one eye construction, markings and a palette per animal. Adding the next four is a render, not a drawing.</div>
<div style="height:40px"></div>
${secLabel('RASCAL — THE MASCOT, RENDERED')}
<div style="display:flex;gap:50px;align-items:flex-end;flex-wrap:wrap">
${cell(`<div style="position:relative;width:200px;height:170px"><div style="position:absolute;left:26px;top:0">${K.rascal(150)}</div><div style="position:absolute;left:0;right:0;top:112px;height:58px;background:${S.sunk};border-radius:22px 22px 0 0;box-shadow:0 -3px 12px rgba(36,35,33,.06)"></div></div>`,'Over the sheet edge, at peek')}
${cell(`<div style="height:170px;display:flex;align-items:flex-end;gap:8px">${K.rascal(150)}<svg width="26" height="24" viewBox="0 0 26 24" fill="${S.hair}" style="display:block;margin-bottom:60px"><circle cx="4" cy="18" r="3"/><circle cx="13" cy="11" r="4"/><circle cx="22" cy="3" r="3"/></svg></div>`,'While a link resolves')}
${cell(`<div style="height:170px;display:flex;align-items:flex-end">${K.rascal(160)}</div>`,'The save moment')}
</div>
<div style="height:46px"></div>
${secLabel('CRITTERS — URBAN SCAVENGERS. IDENTITY IS THE PAIR, NEVER THE COLOUR')}
<div style="display:flex;gap:38px;align-items:flex-start;flex-wrap:wrap">
${K.LAUNCH_CRITTERS.map(c=>cell(K.critter(c,96), c[0].toUpperCase()+c.slice(1))).join('')}
<div style="width:1px;height:96px;background:${S.hair};margin:0 6px"></div>
${K.LATER_CRITTERS.map(([c,hex])=>cell(`<div style="width:92px;height:92px;border-radius:26px;border:1.5px dashed ${S.hair};background:${hex}2E;display:flex;align-items:center;justify-content:center"><div style="width:36px;height:36px;border-radius:999px;background:${hex}"></div></div>`, c[0].toUpperCase()+c.slice(1)+' · later')).join('')}</div>
<div style="height:46px"></div>
${secLabel('DEN EMBLEMS')}
<div style="display:flex;gap:42px">${['lantern','acorn','moon','peak','leaf'].map(k=>cell(K.emblem(k,54), k[0].toUpperCase()+k.slice(1))).join('')}</div>
<div style="height:46px"></div>
${secLabel('PIN FAMILY — CATEGORY IS THE INTERIOR GLYPH, NEVER THE COLOUR')}
<div style="display:flex;gap:34px;align-items:flex-end;flex-wrap:wrap;background:${S.land};border-radius:22px;padding:28px 32px">
${cell(K.pinSvg('eat',false),'Food · rest')}${cell(K.pinSvg('drink',false),'Drinks · rest')}${cell(K.pinSvg('do',false),'Outdoors · rest')}
${cell(K.pinSvg('drink',true),'Selected · lifts, tangerine')}
${cell(`<div style="position:relative">${K.pinSvg('eat',false)}<div style="position:absolute;top:1px;right:-1px;width:11px;height:11px;border-radius:999px;background:${S.flare};box-shadow:0 0 0 2px ${S.land}"></div></div>`,'In a Caper')}
${cell(`<div style="position:relative">${K.pinSvg('eat',false)}<div style="position:absolute;left:-9px;top:-11px;border-radius:999px;box-shadow:0 0 0 2.5px ${S.paper}">${K.av('mia',28)}</div></div>`,'Filtered to one person')}
${cell(K.dot,'Filtered out · 14px')}
<div style="width:1px;height:56px;background:${S.hair}"></div>
${cell(K.cluster(4,40),'Cluster · 2–9')}${cell(K.cluster(23,46),'Cluster · 10–49')}${cell(K.cluster(72,54),'Cluster · 50+')}</div>
<div style="height:46px"></div>
${secLabel('CONTROLS')}
<div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">
<div style="width:250px">${K.btn('Add to Stash')}${cap('Primary · charcoal on tangerine, 5.5:1')}</div>
<div style="width:250px">${K.btn2('Search for a place', K.icSearch)}${cap('Secondary')}</div>
<div style="width:170px">${K.textBtn('Add another')}${cap('Tertiary')}</div>
<div>${K.seg('Nearby','Date')}${cap('Sort, not a tab')}</div></div>
<div style="height:24px"></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${K.chipEveryone(true)}${K.chipToday(false)}${K.chipPerson('mia',false)}${K.chipPerson('josh',true)}</div>
<div style="height:24px"></div>
<div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">
<div style="width:320px">${K.field('Name your Den','Toronto Shenanigans')}</div>
<div style="width:430px;border:1px solid ${S.hair};border-radius:20px;overflow:hidden">${K.listRow(byId('s1'), true)}${K.listRow(byId('s2'), false)}</div></div>
<div style="height:46px"></div>
${secLabel('COLOUR — NEUTRALS CARRY STRUCTURE, TANGERINE MEANS TAPPABLE, PASTELS ARE PEOPLE')}
<div style="display:flex;gap:16px;flex-wrap:wrap">${[['#FBFAF6','paper'],['#F2EEE2','paper sunk'],['#E5E0D4','hairline'],['#8A8478','ink muted'],['#5E594F','ink secondary'],['#242321','ink']].map(([h,n])=>swatch(h,n)).join('')}</div>
<div style="height:18px"></div>
<div style="display:flex;gap:16px;flex-wrap:wrap">${[['#FF6846','flare'],['#E24E2E','flare press'],['#FFE9E2','flare wash']].map(([h,n])=>swatch(h,n)).join('')}
<div style="width:1px;background:${S.hair};margin:0 10px"></div>
${[['#A9B6C6','raccoon'],['#E7BCC1','possum'],['#D3A78E','squirrel'],['#B8A9C9','skunk']].map(([h,n])=>swatch(h,n)).join('')}</div>
</div>`, 980, 1520));

/* ---- Asset set · 2 — the tank pass additions ---- */
const glassSwatch = (dusk=false) => {
  const T = dusk ? K.SD : S;
  const inner = `<div style="position:relative;width:220px;height:150px;border-radius:18px;overflow:hidden;background:${T.land}">
<svg width="220" height="150" viewBox="0 0 220 150" style="position:absolute;inset:0"><path d="M150-10C170 40 200 60 230 40V-10Z" fill="${T.water}"/><g stroke="${T.roads}" stroke-width="9" fill="none"><path d="M40-5V160"/><path d="M130-5V160"/><path d="M-5 60H230"/></g></svg>
<div style="position:absolute;left:60px;top:26px">${K.pinSvg('eat',false)}</div><div style="position:absolute;left:150px;top:44px">${K.pinSvg('drink',true)}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:${T.glass};-webkit-backdrop-filter:blur(20px) saturate(110%);backdrop-filter:blur(20px) saturate(110%);border-radius:18px 18px 0 0;box-shadow:0 -1px 0 ${T.glassRim},${T.glassDepth}"><div style="width:36px;height:4px;border-radius:2px;background:${T.hair};margin:9px auto 0"></div></div></div>`;
  return dusk ? K.toDusk(inner) : inner;
};
files['Assets2.dc.html'] = K.doc(K.frame(S.paper, `<div style="padding:42px 44px 50px">
<div style="font-family:${D};font-size:36px;font-weight:600;letter-spacing:-.3px;color:${S.ink}">The tank pass</div>
<div style="font-size:15px;line-height:22px;color:${S.ink2};margin-top:10px;max-width:640px;text-wrap:pretty">A third type voice, one pane of glass, and a mascot who talks. Borrowed from crechetank.com as staging, voice and material — not as render style, and not as a paint job. Water is the only colour that came across.</div>
<div style="height:40px"></div>
${secLabel('THREE VOICES — FREDOKA SPEAKS FOR THE APP, NUNITO FOR WHAT YOU READ, MONO FOR THE MACHINE AND FOR RASCAL')}
<div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap">
<div style="width:220px">${K.display('6 good ideas', 40)}${cap('Display · Fredoka 600 · 40 / 34 / 28 / 18')}</div>
<div style="width:250px"><div style="font-size:17px;line-height:24px;color:${S.ink}">Dual Citizen Coffee Bar is on the map for Toronto Shenanigans.</div>${cap('Body · Nunito 400–700 · 17 / 16 / 15 / 13')}</div>
<div style="width:230px">${K.kicker('Your shared stash · 6 saved')}<div style="height:10px"></div>${K.hint('pull up for the list')}<div style="height:10px"></div>${K.mono('SNIFFING · 64%')}${cap('Mono · IBM Plex Mono 500 · kicker 12 caps .14em · hint 13 lowercase · progress 13 tabular')}</div></div>
<div style="height:46px"></div>
${secLabel("RASCAL'S BUBBLE — ONLY WHILE HE IS DOING SOMETHING: SNIFFING, AND THE SAVE. EVERYWHERE ELSE HIS LINES ARE PLAIN TEXT")}
<div style="display:flex;gap:36px;align-items:flex-end;flex-wrap:wrap">
${K.bubble('reading the link…', {w:230, tail:'bl'})}${K.bubble("saved to the stash.", {w:190, tail:'br'})}
<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 20px">${K.pawPrint(S.hair,30)}${K.hint('nothing saved yet.', 'text-align:center;color:'+S.ink2)}</div></div>
${cap('Bubble: one SVG path, 1px rim, paper 72%, 180ms rise. Empty states: paw print + the line in mono, no balloon')}
<div style="height:46px"></div>
${secLabel('THE ONE PANE OF GLASS — THE SHEET, AND NOTHING ELSE')}
<div style="display:flex;gap:36px;align-items:flex-start;flex-wrap:wrap">
${cell(glassSwatch(false), 'Day · paper 72% · blur 20 · rim white 65% 1px · depth inset -14px 24px #081E24 5%')}
${cell(glassSwatch(true), 'Dusk · #1B1917 66% · rim white 14%')}
${cell(`<div style="display:flex;gap:14px">${swatch('#C2E6EE','water · day')}${swatch('#0F2E31','water · dusk')}</div>`, 'Replaces #DCE5E3 / #181D1E. The only tank colour')}
${cell(`<div style="display:flex;gap:10px"><div style="position:relative;width:96px;height:96px;border-radius:16px;background:${S.paper};border:1px solid ${S.hair};overflow:hidden">${K.grain(.5)}</div><div style="position:relative;width:96px;height:96px;border-radius:16px;background:${S.land};overflow:hidden">${K.grain(.5)}${K.vignette}</div></div>`, 'Grain · 220px tile, 5% multiply · plus vignette on the map')}</div>
<div style="height:46px"></div>
${secLabel('FILTERS COMPOSE — PERSON AND CATEGORY. SEARCH IS A CONTROL, SO IT STAYS NUNITO')}
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${K.chipPerson('mia',true)}<div style="width:1px;height:28px;background:${S.hair}"></div>${K.chipCat('eat',false)}${K.chipCat('drink',true)}${K.chipCat('do',false)}</div>
<div style="height:16px"></div>
<div style="display:flex;gap:20px;flex-wrap:wrap"><div style="width:330px;background:${S.paper};border:1px solid ${S.hair};border-radius:22px;padding:6px 0">${K.searchField()}</div><div style="width:330px;background:${S.paper};border:1px solid ${S.hair};border-radius:22px;padding:6px 0">${K.searchField('pierogi')}</div></div>
${cap('Kicker reads "Mia’s drinks" when both are on. The field only takes input at the full detent')}
<div style="height:46px"></div>
${secLabel("COMMENTS — ONE LINE PER FRIEND. THE SAVER'S NOTE IS THE FIRST CARD")}
<div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
<div style="width:340px;display:flex;flex-direction:column;gap:8px">${K.takeCard('josh',"Josh won't shut up about the pierogi",'stashed it · 3d')}${K.takeCard('mia','the beet salad is better than the pierogi','2d')}</div>
<div style="width:340px"><div style="height:52px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};display:flex;align-items:center;padding:0 16px;font-size:15px;color:${S.muted}">Add a comment</div><div style="height:8px"></div>${K.hint('add a comment')}${cap('Appears after “I’m in”, 180ms ease-out. Submit appends instantly')}</div></div>
<div style="height:46px"></div>
${secLabel('THE ROOM — ONE SIZE, EVENLY PLACED, MONO LABELS. PICKER AND PEOPLE, NEVER THE MAP')}
<div style="display:flex;gap:36px;align-items:flex-start;flex-wrap:wrap">
<div style="width:342px">${K.room(K.roomHead('raccoon','Amelia','9 saved',true) + K.roomHead('possum','Mia','4 saved') + K.roomHead('squirrel','Josh','2 saved') + K.roomHead('skunk','Zoe','1 saved'))}</div>
<div style="max-width:300px;font-size:13px;line-height:19px;color:${S.ink2}">One size (72px), two columns, evenly spaced — the heads are the identity, the layout stays quiet. Selected: 2px tangerine ring, 8px dot. A ±2px bob on a slow sine, phase offset per head; off under Reduce Motion.</div></div>
<div style="height:46px"></div>
${secLabel('RASCAL — TWO POSES STILL TO RENDER, SAME RIG')}
<div style="display:flex;gap:50px;align-items:flex-end;flex-wrap:wrap">
${cell(K.rascal(150),'rascal-peek.png · have')}
${cell(`<div style="width:150px;height:146px;border-radius:26px;border:1.5px dashed ${S.hair};display:flex;align-items:center;justify-content:center">${K.pawPrint(S.hair,40)}</div>`,'rascal-sniff.png · nose down, one paw forward · render needed')}
${cell(`<div style="width:150px;height:146px;border-radius:26px;border:1.5px dashed ${S.hair};display:flex;align-items:center;justify-content:center">${K.pawPrint(S.hair,40)}</div>`,'rascal-cheer.png · both paws up · render needed')}</div>
</div>`, 980, 2520));

/* ---------- canvas ---------- */
const C = (i) => i * 470, ROW = (r) => r * 964;
const ab = (file, x, y, title, extra={}) => ({ file, x, y, w:390, h:844, title, ...extra });
const canvas = {
  artboards: [
    ab('PlacesPeek.dc.html',     C(0), ROW(0), 'Places · peek'),
    ab('Main.dc.html',           C(1), ROW(0), 'Places · working prototype', { is_interactive:true }),
    ab('PlacesFull.dc.html',     C(2), ROW(0), 'Places · full'),
    ab('PlacesFiltered.dc.html', C(3), ROW(0), 'Places · filtered to Mia'),
    ab('AddPlace.dc.html',       C(0), ROW(1), 'Add a place'),
    ab('Confirm.dc.html',        C(1), ROW(1), 'Confirm · working prototype', { is_interactive:true }),
    ab('Saved.dc.html',          C(2), ROW(1), 'Saved'),
    ab('PlaceDetail.dc.html',    C(3), ROW(1), 'Place detail'),
    ab('Home.dc.html',           C(0), ROW(2), 'Home'),
    ab('People.dc.html',         C(1), ROW(2), 'People · the Den'),
    ab('OnboardWelcome.dc.html', C(2), ROW(2), 'Onboarding · welcome'),
    ab('OnboardCritter.dc.html', C(3), ROW(2), 'Onboarding · you'),
    ab('OnboardDen.dc.html',     C(4), ROW(2), 'Onboarding · Den'),
    { file:'Assets.dc.html', x:C(0), y:ROW(3), w:980, h:1520, title:'Asset set' },
    ab('AddOptionA.dc.html', C(0), 0, 'A · Docked on the sheet', { page:'page-2' }),
    ab('AddOptionB.dc.html', C(1), 0, 'B · Header action', { page:'page-2' }),
    ab('AddOptionC.dc.html', C(2), 0, 'C · Fixed corner', { page:'page-2' }),
    ab('AddOptionD.dc.html', C(3), 0, 'D · Raised in the nav', { page:'page-2' }),
    ab('AddOptionE.dc.html', C(4), 0, 'E · Fixed corner, morphing form', { page:'page-2' }),
    ab('PlacesEmpty.dc.html',       C(0), ROW(0), 'Places · empty',            { page:'page-3' }),
    ab('PlacesSearch.dc.html',      C(1), ROW(0), 'Places · searching',        { page:'page-3' }),
    ab('PlacesSearchEmpty.dc.html', C(2), ROW(0), 'Places · nothing found',    { page:'page-3' }),
    ab('ConfirmSniffing.dc.html',   C(3), ROW(0), 'Confirm · sniffing',        { page:'page-3' }),
    ab('PlacesDusk.dc.html',        C(0), ROW(1), 'Places · dusk',             { page:'page-3' }),
    ab('PeopleDusk.dc.html',        C(1), ROW(1), 'People · dusk',             { page:'page-3' }),
    { file:'Assets2.dc.html', x:C(2), y:ROW(1), w:980, h:2520, title:'Asset set · tank pass', page:'page-3' },
  ],
  pages: [
    { id:'page-1', name:'Screens' },
    { id:'page-2', name:'Add button' },
    { id:'page-3', name:'v1.1 · tank pass' },
  ],
  annotations: [
    { id:'note-tank', x:-540, y:40, w:440, page:'page-3',
      text:"The tank pass — 16 September.\n\nTwo references. crechetank.com gave us staging, voice and material: a mono third type voice for kickers, hints and Rascal; one pane of frosted glass (the sheet, and only the sheet — the map ghosts through at every detent); Rascal talking in blob bubbles; the critter in front of the display title on Saved; heads floating in a room for the picker and for People; grain and a vignette on the map.\n\nCorner gave us features: friends' one-line takes on a place (vibe checks), searching your own Stash, category chips that compose with the person chips, and the saver's note on detail.\n\nRejected on purpose: coral display type (titles stay ink), gloss (Rascal stays matte), whole-scene blur, a serif, ranks and streaks, dense labelled pins.\n\nWater is the only colour that came from the tank. By day it is the lake; at dusk it is the tank at night." },
    { id:'note-tank-2', x:-540, y:ROW(1)+40, w:440, page:'page-3',
      text:"Every kicker on page 1 is now mono too — one change to kicker() in parts-a.mjs restyled the whole set.\n\nStill to render: rascal-sniff.png and rascal-cheer.png off the same rig. Both boards use the peek pose as a stand-in.\n\nDusk is a token swap over finished boards (toDusk), not a second design system. Nothing in the app consumes it yet." },
    { id:'note-places', x:-540, y:ROW(0)+40, w:440,
      text:"Places — three detents.\n\nThe middle artboard is live: drag or tap the handle to move between peek, half and full; tap a chip to filter; tap a pin or a row and the other side follows. Drag the map to pan, +/- to zoom, arrow to recentre.\n\nThe sheet stops at the top of the tab bar rather than running underneath it — that overlap is what was swallowing the peek state. Detents are measured against the 761pt tab-screen height, not the full 844.\n\nRascal peeks over the sheet at peek and ducks away as it opens. Filter to one person and their pins gain that member's critter while everyone else's collapse to 14px dots." },
    { id:'note-save', x:-540, y:ROW(1)+40, w:440,
      text:"The save loop, end to end.\n\nConfirm is live: it opens on Rascal sniffing, lands on the high-confidence result, and \"not right\" opens the other two. \"None of these\" drops into search with the city pre-filled. Add to Stash runs a mock save into the success moment.\n\nAdd-a-place takes a pasted link, a search, or typed details — three sources, so the app never reads as a single-source client.\n\nPlace detail is where \"I'm in\" lives, and the only route out to the original post." },
    { id:'note-rest', x:-540, y:ROW(2)+40, w:440,
      text:"Third tab is People, not Den.\n\nA Den is an object a person can have several of, so it can't be the destination — People is the column, and this Den is what's inside it.\n\nOnboarding keeps what it collects: a name beside the critter, a name and emblem for the Den. Both steps currently throw the answer away." },
    { id:'note-add-rec', x:C(4), y:920, w:440, page:'page-2',
      text:"E is the recommendation.\n\nAdding a place is a global verb — you do it because you saw a reel, not because of what is on screen. Global verbs want a stable home, and the corner is the only spot that is screen-anchored, thumb-reachable, and free at all three detents.\n\nSo position never changes; only the form does. Labelled while the map is dominant and there is room, a bare circle once the list needs the space. That keeps A's teaching value without A's moving target.\n\nRascal keeps the sheet edge above it — different band, no collision." },
    { id:'note-add', x:-540, y:40, w:440, page:'page-2',
      text:"Where does the + live?\n\nAdding a place is the whole product, so this is worth getting right rather than parking it at the end of the chip row where it is now.\n\nA · Docked on the sheet. A labelled pill while the map is dominant, collapsing to a circle as the sheet rises — the label earns its place only when there is room. Thumb-reachable, and it choreographs with Rascal. Costs the most motion, and it moves, so it is never in one remembered spot.\n\nB · Header action. Always in the same place, unmissable next to the title, and it absorbs the search icon which already opened the same sheet. Worst thumb reach on a large phone, and it competes with the screen title.\n\nC · Fixed corner. The convention, and the most predictable: one place, always, at every detent. Reads generic, and it sits on top of a row at the taller detents.\n\nD · Raised in the nav. Loudest possible signal that this is the main action. But it puts a global verb in a bar reserved for destinations, and §7 fixed that bar at three.\n\nE · Fixed corner, morphing form. C's stable home with A's prominence, carried by size and label rather than by position. The pill collapses to a circle as the sheet rises.",
    },
    { id:'note-assets', x:-540, y:ROW(3)+40, w:440,
      text:"The critter roster is now urban.\n\nRaccoon, possum, squirrel, skunk — the animals that actually raid a city at night. That settles the tension in §10.4 at the roster level: cozy low-poly read pastoral when the cast was fox, owl and frog.\n\nThe four heads share one rig — same dodecagon skull, same facet breaks, same eye and snout construction — so a new critter is markings and a palette, which is the half-hour claim in §10.5.\n\nRascal is the supplied render. The critters are vector stand-ins and want renders from the same rig." },
  ],
  launch: { view: 'canvas', page: 'page-3' },
};

for (const [n, src] of Object.entries(files)) writeFileSync(OUT(n), src);
writeFileSync(OUT('canvas.json'), JSON.stringify(canvas, null, 2));
console.log('wrote', Object.keys(files).length, 'artboards + canvas.json');
