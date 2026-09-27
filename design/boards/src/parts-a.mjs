/* ===== Ruckus design system — matches tokens.ts, restyled 1 Sep, tank pass 16 Sep ===== */
export const S = {
  paper:'#FBFAF6', sunk:'#F2EEE2', hair:'#E5E0D4', muted:'#8A8478',
  ink2:'#5E594F', ink:'#242321', flare:'#FF6846', press:'#E24E2E',
  wash:'#FFE9E2', dim:'#C9C3B5',
  land:'#F0ECE0', parks:'#E3EBDC', roads:'#FBFAF6', lot:'#DBD5C7', label:'#A79F91',
  // tank pass — water is the only colour borrowed from the tank; glass is the sheet, and only the sheet
  water:'#C2E6EE',
  glass:'rgba(251,250,246,.72)', glassRim:'rgba(255,255,255,.65)',
  glassDepth:'inset 0 1px 0 rgba(255,255,255,.65), inset 0 -14px 24px rgba(8,30,36,.05)',
};
/* dusk twins, same keys — toDusk() swaps them over a finished board */
export const SD = {
  paper:'#1B1917', sunk:'#252220', hair:'#38332D', muted:'#8F887C',
  ink2:'#C9C2B4', ink:'#F2EDE3', flare:'#FF7A5C', press:'#E24E2E',
  wash:'#3A2620', dim:'#4A443C',
  land:'#211E1B', parks:'#232821', roads:'#2E2A26', lot:'#38332D', label:'#6B655B',
  water:'#0F2E31',
  glass:'rgba(27,25,23,.66)', glassRim:'rgba(255,255,255,.14)',
  glassDepth:'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -14px 24px rgba(0,0,0,.18)',
};
export const FONT = `'Nunito',-apple-system,BlinkMacSystemFont,system-ui,sans-serif`;
export const DISP = `'Fredoka','Nunito',-apple-system,system-ui,sans-serif`;
export const MONO = `'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace`;
export const TOP = 59, BOT = 34, TABH = 83;
export const TOPS = [624, 365, 91];
export const SHADOW = '0 2px 12px rgba(36,35,33,.10)';

/* ---- the Den: urban critters, §10.5 ---- */
export const WHO  = { amelia:'raccoon', mia:'possum', josh:'squirrel', zoe:'skunk' };
export const NAME = { amelia:'Amelia', mia:'Mia', josh:'Josh', zoe:'Zoe' };
export const CATLABEL = { eat:'Food', drink:'Drinks', do:'Outdoors' };
export const PLACES = [
  {id:'s1',name:'Bar Raval',        hood:'Little Italy',  km:'1.2 km',cat:'drink',by:'mia',   going:['mia','amelia','josh'],x:160,y:196,blurb:'Tiny plates, big Friday energy'},
  {id:'s6',name:'Grey Gardens',     hood:'Kensington',    km:'2.0 km',cat:'eat',  by:'josh',  going:['josh','mia','zoe'],  x:236,y:130,blurb:"Josh won't shut up about the pierogi"},
  {id:'s3',name:'Bellwoods Brewery',hood:'Ossington',     km:'2.4 km',cat:'drink',by:'josh',  going:['josh','zoe'],        x:290,y:228,blurb:'Patio, and you can take cans home'},
  {id:'s4',name:'Trinity Bellwoods',hood:'Dundas West',   km:'3.1 km',cat:'do',   by:'zoe',   going:['zoe','amelia'],      x:112,y:322,blurb:'Blanket, snacks, three hours gone'},
  {id:'s2',name:'Dual Citizen',     hood:'King West',     km:'1.8 km',cat:'eat',  by:'amelia',going:['amelia'],            x:64, y:262,blurb:'The coffee that started all this'},
  {id:'s5',name:"Sanagan's",        hood:'Kensington',    km:'2.7 km',cat:'eat',  by:'mia',   going:['mia'],               x:318,y:296,blurb:'Butcher counter, sandwiches at the back'},
];

/* ---- critters: pre-rendered low-poly heads (§10.2) ---- */
export const LAUNCH_CRITTERS = ['raccoon','possum','squirrel','skunk'];
export const LATER_CRITTERS = [['chipmunk','#F0BE8A'],['pigeon','#9EC4C2'],['fox','#E0C67C'],['crow','#8F97A3']];
export const CRITTER_SHADOW = 'drop-shadow(0 1px 2px rgba(36,35,33,.18))';
export const critter = (n, s) => `<img src="critter-${n}.png" alt="" style="width:${s}px;height:auto;display:block;flex:none;filter:${CRITTER_SHADOW}"/>`;
export const av = (person, s) => critter(WHO[person], s);

/* ---- glyphs ---- */
const G = {
  eat: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 3v5.4a1.6 1.6 0 0 0 3.2 0V3"/><path d="M8 9.8V21"/><path d="M16.6 3c-1.9 0-3.1 2-3.1 4.4s1.2 4 3.1 4 3.1-1.6 3.1-4S18.5 3 16.6 3Z"/><path d="M16.6 11.6V21"/></g>`,
  drink: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 4.4h14.8L12 12.6V19"/><path d="M8.4 19h7.2"/></g>`,
  do: `<g fill="currentColor"><g transform="rotate(-16 8.6 11)"><ellipse cx="8.6" cy="11.6" rx="3.1" ry="4.3"/><circle cx="5.6" cy="5.9" r="1.15"/><circle cx="8.6" cy="5.1" r="1.2"/><circle cx="11.5" cy="5.9" r="1.15"/></g><g transform="rotate(14 15.6 16)"><ellipse cx="15.6" cy="16.4" rx="3.1" ry="4.3"/><circle cx="12.6" cy="10.7" r="1.15"/><circle cx="15.6" cy="9.9" r="1.2"/><circle cx="18.5" cy="10.7" r="1.15"/></g></g>`,
  spark: `<g fill="currentColor"><path d="M13.4 2.4 15.1 8l5.6 1.7-5.6 1.7-1.7 5.6-1.7-5.6L6.1 9.7 11.7 8Z"/><path d="M6.2 14.6 7.1 17l2.4.9-2.4.9-.9 2.4-.9-2.4L2.9 18l2.4-.9Z"/></g>`,
};
export const glyph = (k, size, colour) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex:none;color:${colour}">${G[k]}</svg>`;

/* ---- sprite sheet ---- */
export const SPRITES = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${Object.keys(G).map(k=>`<g id="g-${k}">${G[k]}</g>`).join('')}
<g id="e-lantern"><path d="M20 3 33 12v18L20 37 7 30V12Z" fill="#E0C67C"/><path d="M20 3 33 12v18L20 37Z" fill="#CBB167"/><path d="M20 13 26 17v8l-6 4-6-4v-8Z" fill="#FBFAF6" opacity=".55"/></g>
<g id="e-acorn"><path d="M20 37 8 24l4-8h16l4 8Z" fill="#D3A78E"/><path d="M20 37 32 24l-4-8h-8Z" fill="#BE9179"/><path d="M6 13h28l-4 5H10Z" fill="#8A8478"/></g>
<g id="e-moon"><path d="M27 4 34 20l-7 16-9-8 4-8-4-8Z" fill="#A9B6C6"/><path d="M27 4 34 20l-7 16Z" fill="#93A0B1"/><circle cx="12" cy="12" r="3" fill="#A9B6C6"/></g>
<g id="e-peak"><path d="M20 5 36 34H4Z" fill="#9EC4C2"/><path d="M20 5 36 34H20Z" fill="#86ADAB"/><path d="M20 5 27 18h-14Z" fill="#FBFAF6" opacity=".7"/></g>
<g id="e-leaf"><path d="M20 3 34 20 20 37 6 20Z" fill="#A8C4A2"/><path d="M20 3 34 20 20 37Z" fill="#93AF8D"/><path d="M20 6v28" stroke="#FBFAF6" stroke-width="1.6" opacity=".6"/></g>
<g id="p-paw" fill="currentColor"><ellipse cx="6.2" cy="9" rx="3.2" ry="4.2"/><ellipse cx="13" cy="5.2" rx="3.2" ry="4.4"/><ellipse cx="20.2" cy="5.8" rx="3.2" ry="4.4"/><ellipse cx="26.2" cy="10.4" rx="3" ry="3.9"/><path d="M15.6 12.2c4.9 0 8.6 3.1 8.6 7.2 0 3.4-2.8 5.6-6.2 5.6-2.1 0-2.6-.9-4.6-.9s-2.7.9-4.8.9c-3.3 0-6-2.2-6-5.6 0-4.1 4.4-7.2 9.6-7.2Z"/></g>
</defs></svg>`;

export const use = (id,w,h,vb,extra='') => `<svg width="${w}" height="${h}" viewBox="${vb}" style="display:block;flex:none;${extra}"><use href="#${id}"/></svg>`;
export const AVBG = { raccoon:'#DEE4EA', possum:'#F7E3E5', squirrel:'#EFDDD1', skunk:'#E4DCEC' };
export const emblem = (k,s) => use('e-'+k, s, s, '0 0 40 40');
export const pawPrint = (c,w=30) => `<svg width="${w}" height="${Math.round(w*.93)}" viewBox="0 0 30 28" style="display:block;flex:none;color:${c}"><use href="#p-paw"/></svg>`;
export const rascal = (w) => `<img src="rascal-peek.png" alt="Rascal" style="width:${w}px;height:auto;display:block"/>`;

/* ---- pins: teardrop token, glyph knocked out ---- */
export const pinSvg = (cat, sel) => {
  const w = sel?52:40, bg = sel?S.flare:S.ink, fg = sel?S.ink:S.paper;
  const h = Math.round(w*52/40), g = Math.round(w*0.55);
  return `<div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 ${sel?5:2}px ${sel?9:4}px rgba(36,35,33,${sel?.26:.18}))">
<svg width="${w}" height="${h}" viewBox="0 0 40 52" style="display:block"><path d="M11 34h18l-9 18Z" fill="${bg}"/><circle cx="20" cy="20" r="20" fill="${bg}"/></svg>
<div style="position:absolute;left:0;right:0;top:${Math.round(w*0.5-g/2)}px;display:flex;justify-content:center;color:${fg}"><svg width="${g}" height="${g}" viewBox="0 0 24 24" style="display:block"><use href="#g-${cat}"/></svg></div></div>`;
};
export const dot = `<div style="width:14px;height:14px;border-radius:999px;background:${S.dim};box-shadow:0 1px 2px rgba(36,35,33,.14)"></div>`;
export const cluster = (n,size) => `<svg width="${size}" height="${Math.round(size*.9)}" viewBox="-3 0 46 41" style="display:block;filter:drop-shadow(0 2px 4px rgba(36,35,33,.18))"><path d="M11 37h18l-9 4Z" fill="${S.ink}"/><path d="M10 1h20a8 8 0 0 1 8 8v4l-3 6 3 6v4a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8v-4l3-6-3-6V9a8 8 0 0 1 8-8Z" fill="${S.ink}"/><text x="20" y="25" text-anchor="middle" font-family="${FONT}" font-size="${size>=46?15:13}" font-weight="700" fill="${S.paper}">${n}</text></svg>`;
export const drop = (p,sel) => `<div style="position:absolute;left:${p.x-(sel?26:20)}px;top:${p.y-(sel?68:52)}px">${pinSvg(p.cat,sel)}</div>`;
export const dropDot = (p) => `<div style="position:absolute;left:${p.x-7}px;top:${p.y-14}px">${dot}</div>`;
export const dropAv = (p) => `<div style="position:absolute;left:${p.x-20}px;top:${p.y-52}px">${pinSvg(p.cat,false)}<div style="position:absolute;left:-14px;top:-20px">${av(p.by,34)}</div></div>`;

/* ---- map ---- */
const label = (t,x,y) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="500" letter-spacing="1.4" fill="${S.label}">${t}</text>`;
export const mapSvg = `<svg width="390" height="844" viewBox="0 0 390 844" style="position:absolute;inset:0;display:block">
<rect x="-260" y="-260" width="910" height="1364" fill="${S.land}"/>
<path d="M300-40C330 40 372 70 420 44V-40Z" fill="${S.water}"/>
<path d="M-40 760C30 730 90 770 150 740 210 712 250 760 300 900H-40Z" fill="${S.water}"/>
<rect x="36" y="122" width="152" height="126" rx="3" fill="${S.parks}"/>
<rect x="252" y="228" width="146" height="140" rx="3" fill="${S.parks}"/>
<rect x="20" y="600" width="130" height="98" rx="3" fill="${S.parks}"/>
<g stroke="${S.lot}" stroke-width="1.6" stroke-dasharray="7 7" fill="none"><path d="M128-20V860"/><path d="M246-20V860"/><path d="M354-20V860"/><path d="M-20 232H410"/><path d="M-20 408H410"/><path d="M-20 586H410"/></g>
<g stroke="${S.roads}" stroke-width="15" fill="none" stroke-linecap="round"><path d="M70-20V860"/><path d="M186-20V860"/><path d="M304-20V860"/><path d="M-20 150H410"/><path d="M-20 322H410"/><path d="M-20 500H410"/><path d="M-20 676H410"/></g>
<g stroke="${S.roads}" stroke-width="17" fill="none" stroke-linecap="round"><path d="M-24 250C70 206 176 268 268 214 322 182 366 196 414 178"/><path d="M-24 560C92 528 196 606 300 566 348 548 380 552 414 542"/></g>
${label('BLOORCOURT',112,192)}${label('LITTLE ITALY',212,468)}${label('TRINITY',85,656)}</svg>`;

/* ---- chrome ---- */
export const sv = (b,w=24,sw=1.9) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${b}</svg>`;
export const icHome = sv(`<path d="M3.6 10.4 12 3.4l8.4 7v9.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z"/><path d="M9.4 21.6v-6.4h5.2v6.4"/>`);
export const icPin = sv(`<path d="M12 21.6c4.5-4.7 6.7-8.2 6.7-10.7a6.7 6.7 0 1 0-13.4 0c0 2.5 2.2 6 6.7 10.7Z"/><circle cx="12" cy="10.7" r="2.4"/>`);
export const icPpl = sv(`<circle cx="9.2" cy="8.6" r="3.6"/><path d="M2.8 20.2c0-3.6 2.9-5.9 6.4-5.9s6.4 2.3 6.4 5.9"/><circle cx="17.5" cy="10.5" r="2.8"/><path d="M17 15.1c2.6.3 4.3 2.3 4.3 5.1"/>`);
export const icSearch = sv(`<circle cx="10.9" cy="10.9" r="6.9"/><path d="M15.9 15.9 21 21"/>`, 24, 2);
export const icNav = sv(`<path d="M20.8 3.2 3.6 10.1l7.2 2.9 2.9 7.2Z"/>`, 22, 1.9);
export const icCal = sv(`<rect x="3.4" y="5" width="17.2" height="16" rx="2.6"/><path d="M3.4 9.6h17.2M8 3v4M16 3v4"/>`, 18, 1.8);
export const icLink = sv(`<path d="M10.2 13.8a4.2 4.2 0 0 0 6.1.2l2.6-2.6a4.2 4.2 0 1 0-6-6l-1.5 1.5"/><path d="M13.8 10.2a4.2 4.2 0 0 0-6.1-.2l-2.6 2.6a4.2 4.2 0 0 0 6 6l1.5-1.5"/>`, 20, 1.9);
export const icPen = sv(`<path d="M16.4 3.9a2.3 2.3 0 0 1 3.3 3.3L8.1 18.8l-4.3 1 1-4.3Z"/>`, 20, 1.9);
export const icOut = sv(`<path d="M13.4 4.6h6v6"/><path d="M19.4 4.6 10.6 13.4"/><path d="M17.4 13.9v4.6a1.9 1.9 0 0 1-1.9 1.9H5.5a1.9 1.9 0 0 1-1.9-1.9V8.5a1.9 1.9 0 0 1 1.9-1.9h4.6"/>`, 20, 1.9);
export const icPlus = sv(`<path d="M12 5v14M5 12h14"/>`, 22, 2.3);
export const icMinus = sv(`<path d="M5 12h14"/>`, 22, 2.3);
export const icCheck = sv(`<path d="M4.5 12.6 9.5 17.5 19.5 6.8"/>`, 18, 2.5);
export const chevD = sv(`<path d="M5 8.5 12 15.5 19 8.5"/>`, 16, 2.1);
export const chevR = sv(`<path d="M8.5 4 15.5 12 8.5 20"/>`, 16, 2.1);
export const chevL = sv(`<path d="M15 4 8 12 15 20"/>`, 22, 2.1);

/* ---- the three voices: Fredoka speaks for the app, Nunito for what you read, mono for the machine and for Rascal ---- */
export const kicker = (t) => `<div style="font-family:${MONO};font-size:12px;font-weight:500;letter-spacing:.14em;color:${S.muted}">${t.toUpperCase()}</div>`;
export const display = (t, size=40, colour=S.ink) => `<div style="font-family:${DISP};font-size:${size}px;font-weight:600;letter-spacing:${(-size*0.008).toFixed(2)}px;line-height:1.12;color:${colour}">${t}</div>`;
export const hint = (t, extra='') => `<div style="font-family:${MONO};font-size:13px;font-weight:400;line-height:18px;color:${S.muted};${extra}">${t}</div>`;
export const mono = (t, size=13, colour=S.ink2) => `<div style="font-family:${MONO};font-size:${size}px;font-weight:500;letter-spacing:.1em;font-variant-numeric:tabular-nums;color:${colour}">${t}</div>`;

/* ---- Rascal's bubble: one blob, glass, mono. Rascal only — chips and buttons keep their pills ---- */
export const bubble = (text, {w=230, tail='bl', extra=''}={}) => {
  const tailPos = tail==='br' ? 'right:34px' : 'left:34px';
  return `<div style="position:relative;width:${w}px;${extra}">
<div style="position:relative;padding:14px 18px;background:${S.glass};-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-radius:52% 48% 55% 45% / 60% 55% 45% 40%;box-shadow:inset 0 1px 0 ${S.glassRim},0 10px 26px rgba(36,35,33,.14);font-family:${MONO};font-size:14px;font-weight:400;line-height:1.45;color:${S.ink}">${text}</div>
<div style="position:absolute;bottom:-5px;${tailPos};width:14px;height:14px;background:${S.glass};transform:rotate(45deg);border-radius:3px;box-shadow:2px 2px 6px rgba(36,35,33,.06)"></div></div>`;
};

/* ---- atmosphere: grain and a vignette so the map reads as a place, not a diagram ---- */
export const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
export const grain = (opacity=.5) => `<div style="position:absolute;inset:0;pointer-events:none;opacity:${opacity};mix-blend-mode:multiply;background-image:${GRAIN_URI}"></div>`;
export const vignette = `<div style="position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px rgba(36,35,33,.10)"></div>`;

export const screenHeader = (kick, t, trailing='') => `<div style="position:absolute;top:${TOP}px;left:0;right:0;padding:14px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
<div>${kicker(kick)}<div style="height:6px"></div>${display(t)}</div>
<div style="padding-top:14px;color:${S.ink}">${trailing}</div></div>`;

export const sqBtn = (inner, size=52, radius=16) => `<div style="width:${size}px;height:${size}px;flex:none;border-radius:${radius}px;background:${S.paper};display:flex;align-items:center;justify-content:center;color:${S.ink2};box-shadow:${SHADOW}">${inner}</div>`;
export const mapControls = `<div style="position:absolute;right:16px;top:288px;display:flex;flex-direction:column;gap:14px;align-items:flex-end">
<div style="width:52px;border-radius:16px;background:${S.paper};box-shadow:${SHADOW};color:${S.ink2}"><div style="height:52px;display:flex;align-items:center;justify-content:center">${icPlus}</div><div style="height:1px;background:${S.hair};margin:0 10px"></div><div style="height:52px;display:flex;align-items:center;justify-content:center">${icMinus}</div></div>
${sqBtn(icNav)}</div>`;

export const seg = (a, b) => `<div style="display:flex;background:${S.sunk};border-radius:14px;padding:4px;flex:none">
<div style="height:38px;padding:0 13px;border-radius:11px;display:flex;align-items:center;gap:6px;background:${S.paper};box-shadow:0 1px 3px rgba(36,35,33,.10);color:${S.ink};font-size:14px;font-weight:600">${icNav}${a}</div>
<div style="height:38px;padding:0 13px;border-radius:11px;display:flex;align-items:center;gap:6px;color:${S.muted};font-size:14px;font-weight:600">${icCal}${b}</div></div>`;

export const sheetHeader = (kick, t) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 20px 16px;flex:none">
<div style="flex:1;min-width:0;white-space:nowrap">${kicker(kick)}<div style="height:6px"></div>${display(t, 28)}</div>${seg('Nearby','Date')}</div>`;

export const chipEveryone = (on) => `<div style="height:46px;border-radius:23px;display:flex;align-items:center;gap:9px;padding:0 18px 0 6px;background:${on?S.flare:S.paper};border:1.5px solid ${on?S.flare:S.hair};flex:none">
<div style="display:flex">${['amelia','mia','josh'].map((p,i)=>`<div style="margin-left:${i?-13:0}px">${av(p,32)}</div>`).join('')}</div>
<span style="font-size:15px;font-weight:700;color:${on?S.ink:S.ink2}">Everyone</span></div>`;
export const chipToday = (on) => `<div style="height:46px;border-radius:23px;display:flex;align-items:center;gap:8px;padding:0 18px;background:${on?S.flare:S.paper};border:1.5px solid ${on?S.flare:S.hair};color:${on?S.ink:S.ink2};flex:none">${glyph('spark',19,on?S.ink:S.muted)}<span style="font-size:15px;font-weight:600">Today</span></div>`;
export const chipPerson = (p, on) => `<div style="height:46px;border-radius:23px;display:flex;align-items:center;gap:9px;padding:0 18px 0 7px;background:${on?S.flare:S.paper};border:1.5px solid ${on?S.flare:S.hair};color:${on?S.ink:S.ink2};flex:none">${av(p,34)}<span style="font-size:15px;font-weight:600">${NAME[p]}</span></div>`;
/* category chips — icon + word, same shell as Today. They compose with the person chips: "Mia's drinks" */
export const chipCat = (cat, on) => `<div style="height:46px;border-radius:23px;display:flex;align-items:center;gap:8px;padding:0 18px 0 15px;background:${on?S.flare:S.paper};border:1.5px solid ${on?S.flare:S.hair};color:${on?S.ink:S.ink2};flex:none">${glyph(cat,19,on?S.ink:S.muted)}<span style="font-size:15px;font-weight:600">${CATLABEL[cat]}</span></div>`;
/* scrollX draws the row part-way scrolled, so a board can show the category chips that live past the fold */
export const chipRow = (active, cat=null, scrollX=0) => `<div style="display:flex;align-items:center;height:62px;flex:none">
<div style="position:relative;flex:1;overflow:hidden;height:46px"><div style="display:flex;align-items:center;gap:9px;padding-left:20px;height:46px;margin-left:${-scrollX}px">${chipEveryone(!active)}${chipToday(false)}${['mia','josh','zoe'].map(p=>chipPerson(p,active===p)).join('')}
<div style="width:1px;height:28px;background:${S.hair};flex:none;margin:0 3px"></div>${['eat','drink','do'].map(c=>chipCat(c,cat===c)).join('')}</div>
${scrollX?`<div style="position:absolute;left:0;top:0;bottom:0;width:30px;background:linear-gradient(270deg,rgba(251,250,246,0),${S.paper})"></div>`:''}
<div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:linear-gradient(90deg,rgba(251,250,246,0),${S.paper})"></div></div>
<div style="padding:0 16px 0 6px"><div style="width:46px;height:46px;flex:none;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center">${icPlus}</div></div></div>`;

/* search your own stash — a control, so Nunito, not mono. Lives in the sheet at the full detent */
export const searchField = (q='') => `<div style="margin:6px 20px 10px;height:48px;border-radius:24px;background:${S.sunk};display:flex;align-items:center;gap:10px;padding:0 14px 0 16px;flex:none">
<span style="color:${S.muted}">${sv(`<circle cx="10.9" cy="10.9" r="6.9"/><path d="M15.9 15.9 21 21"/>`,20,2)}</span>
<div style="flex:1;font-size:15px;font-weight:500;color:${q?S.ink:S.muted}">${q||'Search your stash'}</div>
${q?`<div style="width:24px;height:24px;border-radius:999px;background:${S.hair};display:flex;align-items:center;justify-content:center;color:${S.ink2}">${sv(`<path d="M6 6l12 12M18 6 6 18"/>`,12,2.4)}</div>`:''}</div>`;

/* a vibe check — one friend's line about a place. The saver's note is the first card in the stack */
export const takeCard = (person, text, meta) => `<div style="display:flex;gap:12px;align-items:flex-start;background:${S.sunk};border-radius:18px;padding:14px 16px 14px 14px">
${av(person,36)}<div style="flex:1;min-width:0"><div style="font-size:15px;line-height:21px;font-weight:500;color:${S.ink}">${text}</div>
<div style="font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${S.muted};margin-top:6px">${NAME[person].toUpperCase()} · ${meta}</div></div></div>`;

/* the room — critter heads with mono labels, for the picker and for People. Never on the map.
   One size, evenly placed: the heads are the identity, the layout should not compete with them */
export const ROOM_HEAD = 72;
export const roomHead = (n, label, sub, on=false) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:50%;padding:14px 0">
<div style="position:relative;padding:8px">${on?`<div style="position:absolute;inset:0;border-radius:999px;border:2px solid ${S.flare}"></div><div style="position:absolute;right:2px;top:2px;width:9px;height:9px;border-radius:999px;background:${S.flare};box-shadow:0 0 0 2px ${S.paper}"></div>`:''}${critter(n,ROOM_HEAD)}</div>
<div style="font-family:${MONO};font-size:12px;font-weight:500;letter-spacing:.12em;color:${on?S.ink:S.ink2};white-space:nowrap">${label.toUpperCase()}</div>
${sub?`<div style="font-family:${MONO};font-size:11.5px;letter-spacing:.08em;color:${S.muted};margin-top:-4px;white-space:nowrap">${sub.toUpperCase()}</div>`:''}</div>`;
export const room = (heads, extra='') => `<div style="position:relative;border-radius:24px;overflow:hidden;background:${S.paper};border:1px solid ${S.hair};${extra}">
<div style="position:absolute;left:-20%;right:-20%;top:30%;height:46%;background:${S.water};opacity:.28;filter:blur(28px)"></div>${grain(.4)}
<div style="position:relative;display:flex;flex-wrap:wrap;padding:8px 0">${heads}</div></div>`;

export const catTile = (cat, size=56) => `<div style="width:${size}px;height:${size}px;flex:none;border-radius:17px;background:${S.sunk};display:flex;align-items:center;justify-content:center">${glyph(cat, Math.round(size*0.45), S.ink)}</div>`;
export const listRow = (p, sel) => `<div style="display:flex;align-items:center;gap:14px;height:80px;padding:0 20px 0 ${sel?16:20}px;background:${sel?S.wash:'transparent'};border-bottom:1px solid ${sel?'transparent':S.hair};position:relative">
${sel?`<div style="position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:0 3px 3px 0;background:${S.flare}"></div>`:''}
${catTile(p.cat)}
<div style="flex:1;min-width:0"><div style="font-family:${DISP};font-size:18px;font-weight:600;letter-spacing:-.1px;color:${S.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
<div style="font-size:13px;font-weight:500;color:${S.muted};margin-top:1px">${p.hood} · ${p.km}</div>
<div style="font-size:14px;font-weight:500;color:${S.ink2};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.blurb}</div></div>
${av(p.by,44)}</div>`;

const tabItem = (label, icon, on, dotOn) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:${on?S.flare:S.muted}">
<div style="position:relative;width:24px;height:24px">${icon}${dotOn?`<div style="position:absolute;top:-1px;right:-3px;width:8px;height:8px;border-radius:999px;background:${S.flare};box-shadow:0 0 0 2px ${S.paper}"></div>`:''}</div>
<div style="font-size:11.5px;font-weight:${on?700:600};letter-spacing:.1px">${label}</div></div>`;
export const tabbar = (active) => `<div style="position:absolute;left:0;right:0;bottom:0;height:${TABH}px;background:${S.paper};border-top:1px solid ${S.hair};display:flex;padding:9px 0 ${BOT}px">
${tabItem('Home',icHome,active==='Home',true)}${tabItem('Places',icPin,active==='Places',false)}${tabItem('People',icPpl,active==='People',false)}</div>`;

export const btn = (label) => `<div style="height:54px;border-radius:16px;background:${S.flare};color:${S.ink};font-size:17px;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;justify-content:center;gap:9px">${label}</div>`;
export const btn2 = (label, icon='') => `<div style="height:52px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};color:${S.ink2};font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:10px">${icon}<span>${label}</span></div>`;
export const textBtn = (label, c=S.ink2) => `<div style="height:48px;display:flex;align-items:center;justify-content:center;color:${c};font-size:16px;font-weight:600">${label}</div>`;
export const field = (label, value, ph=false) => `<div><div style="margin-bottom:9px">${kicker(label)}</div><div style="height:56px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};display:flex;align-items:center;padding:0 16px;font-size:16px;font-weight:500;color:${ph?S.muted:S.ink}">${value}</div></div>`;

export const frame = (bg, inner, w=390, h=844) => `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg};font-family:${FONT};color:${S.ink};-webkit-font-smoothing:antialiased">${SPRITES}${inner}</div>`;
export const sheet = (top, inner, bottom=TABH) => `<div style="position:absolute;left:0;right:0;top:${top}px;bottom:${bottom}px;background:${S.paper};border-radius:28px 28px 0 0;box-shadow:0 -20px 44px rgba(36,35,33,.10);overflow:hidden;display:flex;flex-direction:column">
<div style="width:44px;height:5px;border-radius:3px;background:${S.hair};margin:10px auto 12px;flex:none"></div>${inner}</div>`;
/* the one pane of glass. The map ghosts through it at every detent — §4's "the map never fully dies", as material */
export const glassSheet = (top, inner, bottom=TABH) => `<div style="position:absolute;left:0;right:0;top:${top}px;bottom:${bottom}px;background:${S.glass};-webkit-backdrop-filter:blur(20px) saturate(110%);backdrop-filter:blur(20px) saturate(110%);border-radius:28px 28px 0 0;box-shadow:0 -1px 0 ${S.glassRim},${S.glassDepth},0 -20px 50px rgba(36,35,33,.12);overflow:hidden;display:flex;flex-direction:column">
${grain(.35)}<div style="width:44px;height:5px;border-radius:3px;background:${S.hair};margin:10px auto 12px;flex:none;position:relative"></div>${inner}</div>`;
export const scrim = `<div style="position:absolute;inset:0;background:rgba(36,35,33,.34)"></div>`;

/* dusk: swap every day value for its twin over a finished board. Roads share paper's hex, so strokes go first */
export const toDusk = (html) => {
  let h = html.split(`stroke="${S.roads}"`).join(`stroke="${SD.roads}"`);
  h = h.split('rgba(251,250,246,').join('rgba(27,25,23,');
  for (const k of Object.keys(S)) if (SD[k] && SD[k] !== S[k]) h = h.split(S[k]).join(SD[k]);
  return h;
};

export const doc = (body, script='') => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..600&family=Nunito:wght@400..800&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
body{margin:0;background:${S.paper};}
*{box-sizing:border-box;}
a{color:${S.press};text-decoration:none;}
a:hover{color:${S.flare};}
input{font:inherit;color:inherit;background:none;border:0;outline:none;}
@media (prefers-reduced-motion: reduce){*{transition-duration:.01ms !important;animation-duration:.01ms !important;}}
</style>
</helmet>
${body}
</x-dc>
${script}
</body>
</html>
`;
