import * as K from './parts-a.mjs';
const S = K.S, F = K.FONT, D = K.DISP, P = K.PLACES;

const stashHeader = (kick, t, sort=true) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 20px 16px;flex:none">
<div style="flex:1;min-width:0;white-space:nowrap">${K.kicker(kick)}<div style="height:6px"></div>${K.display(t, 28)}</div>${sort?K.seg('Nearby','Date'):''}</div>`;

const rows = (n) => P.slice(0, n).map(p => K.listRow(p, false)).join('');

const plusCircle = (size, icon=26) => `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(255,104,70,.34),0 2px 6px rgba(36,35,33,.14)"><svg width="${icon}" height="${icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:block"><path d="M12 5v14M5 12h14"/></svg></div>`;

const plusPill = `<div style="height:58px;border-radius:29px;background:${S.flare};color:${S.ink};display:inline-flex;align-items:center;gap:10px;padding:0 24px 0 18px;box-shadow:0 8px 22px rgba(255,104,70,.34),0 2px 6px rgba(36,35,33,.14)">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:block"><path d="M12 5v14M5 12h14"/></svg>
<span style="font-family:${D};font-size:18px;font-weight:600;letter-spacing:-.15px">Add a place</span></div>`;

const chipRowNoAdd = (active) => `<div style="display:flex;align-items:center;height:62px;flex:none">
<div style="position:relative;flex:1;overflow:hidden;height:46px"><div style="display:flex;gap:9px;padding-left:20px;height:46px">${K.chipEveryone(!active)}${K.chipToday(false)}${['mia','josh','zoe'].map(p=>K.chipPerson(p,active===p)).join('')}</div>
<div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:linear-gradient(90deg,rgba(251,250,246,0),${S.paper})"></div></div></div>`;

const base = ({ sheetTop, header, sheetInner, extra = '', tabbar = K.tabbar('Places'), rascal = '' }) =>
  K.frame(S.land,
    K.mapSvg + P.map(p => K.drop(p, false)).join('') + header + K.mapControls
    + K.sheet(sheetTop, sheetInner) + rascal + extra + tabbar);

/* ---- A · docked on the sheet edge, morphing pill → circle ---- */
export const A = K.doc(base({
  sheetTop: 624,
  header: K.screenHeader('Toronto Shenanigans', 'Places', K.icSearch),
  sheetInner: stashHeader('Your shared stash', '6 good ideas', false),
  rascal: `<div style="position:absolute;left:250px;top:534px;z-index:3">${K.rascal(112)}</div>`,
  extra: `<div style="position:absolute;left:26px;top:550px;z-index:4">${plusPill}</div>
<div style="position:absolute;left:26px;top:352px;display:flex;align-items:center;gap:12px;opacity:.92">
${plusCircle(56)}<div style="background:${S.paper};border-radius:12px;padding:7px 11px;font-size:12px;font-weight:600;color:${S.ink2};box-shadow:0 2px 10px rgba(36,35,33,.1)">…and collapses to this as the sheet rises</div></div>`,
}));

/* ---- B · header action, top right ---- */
export const B = K.doc(base({
  sheetTop: 365,
  header: K.screenHeader('Toronto Shenanigans', 'Places', plusCircle(52, 24)),
  sheetInner: stashHeader('Your shared stash', '6 good ideas') + chipRowNoAdd(null)
    + `<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div><div style="flex:1;overflow:hidden">${rows(4)}</div>`,
}));

/* ---- C · fixed FAB, bottom right ---- */
export const C = K.doc(base({
  sheetTop: 365,
  header: K.screenHeader('Toronto Shenanigans', 'Places', K.icSearch),
  sheetInner: stashHeader('Your shared stash', '6 good ideas') + chipRowNoAdd(null)
    + `<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div><div style="flex:1;overflow:hidden">${rows(4)}</div>`,
  extra: `<div style="position:absolute;right:20px;bottom:103px;z-index:4">${plusCircle(64, 28)}</div>`,
}));

/* ---- D · raised in the tab bar ---- */
const tabbarWithPlus = `<div style="position:absolute;left:0;right:0;bottom:0;height:${K.TABH}px;background:${S.paper};border-top:1px solid ${S.hair};display:flex;padding:8px 0 ${K.BOT}px">
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:${S.muted}"><div style="position:relative;width:24px;height:24px">${K.icHome}<div style="position:absolute;top:-1px;right:-2px;width:8px;height:8px;border-radius:999px;background:${S.flare};box-shadow:0 0 0 2px ${S.paper}"></div></div><div style="font-size:11px;font-weight:500">Home</div></div>
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:${S.flare}">${K.icPin}<div style="font-size:11px;font-weight:700">Places</div></div>
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;color:${S.muted}"><div style="margin-top:-30px">${plusCircle(56, 26)}</div><div style="font-size:11px;font-weight:600;color:${S.ink2}">Add</div></div>
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:${S.muted}">${K.icPpl}<div style="font-size:11px;font-weight:500">People</div></div></div>`;

export const Dopt = K.doc(base({
  sheetTop: 365,
  header: K.screenHeader('Toronto Shenanigans', 'Places', K.icSearch),
  sheetInner: stashHeader('Your shared stash', '6 good ideas') + chipRowNoAdd(null)
    + `<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div><div style="flex:1;overflow:hidden">${rows(4)}</div>`,
  tabbar: tabbarWithPlus,
}));


/* ---- E · fixed corner, form morphs with the detent (the synthesis) ---- */
const plusPillSm = `<div style="height:56px;border-radius:28px;background:${S.flare};color:${S.ink};display:inline-flex;align-items:center;gap:9px;padding:0 22px 0 16px;box-shadow:0 8px 22px rgba(255,104,70,.34),0 2px 6px rgba(36,35,33,.14)">
<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:block"><path d="M12 5v14M5 12h14"/></svg>
<span style="font-family:${D};font-size:17px;font-weight:600;letter-spacing:-.1px">Add</span></div>`;

export const E = K.doc(base({
  sheetTop: 624,
  header: K.screenHeader('Toronto Shenanigans', 'Places', K.icSearch),
  sheetInner: stashHeader('Your shared stash', '6 good ideas', false),
  rascal: `<div style="position:absolute;left:250px;top:534px;z-index:3">${K.rascal(112)}</div>`,
  extra: `<div style="position:absolute;right:20px;bottom:103px;z-index:4">${plusPillSm}</div>
<div style="position:absolute;left:20px;bottom:190px;display:flex;align-items:center;gap:10px">
<div style="background:${S.paper};border-radius:12px;padding:8px 12px;font-size:12px;font-weight:600;color:${S.ink2};box-shadow:0 2px 10px rgba(36,35,33,.1);max-width:210px;line-height:16px">Same corner at every detent — only the label drops away as the sheet rises</div>
<div style="width:34px;height:2px;background:${S.hair}"></div>${plusCircle(44, 22)}</div>`,
}));
