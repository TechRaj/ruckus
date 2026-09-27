import * as K from './parts-a.mjs';
const S = K.S, F = K.FONT, D = K.DISP;

const mapLayer = `<div onPointerDown="{{mapDown}}" style="position:absolute;inset:0;touch-action:none;cursor:grab;transform:translate({{map.x}}px,{{map.y}}px) scale({{map.z}});transform-origin:0 0;transition:{{motion.map}}">
${K.mapSvg}
<sc-for list="{{pins}}" as="p" hint-placeholder-count="6">
<div onClick="{{p.pick}}" style="position:absolute;left:{{p.left}}px;top:{{p.top}}px;transition:{{motion.pin}}">
<sc-if value="{{p.dim}}" hint-placeholder-val="{{false}}"><div style="width:14px;height:14px;border-radius:999px;background:${S.dim};box-shadow:0 1px 2px rgba(36,35,33,.14)"></div></sc-if>
<sc-if value="{{p.show}}" hint-placeholder-val="{{true}}">
<div style="position:relative;width:{{p.w}}px;height:{{p.h}}px;filter:{{p.shadow}}">
<svg width="{{p.w}}" height="{{p.h}}" viewBox="0 0 40 52" style="display:block"><path d="M11 34h18l-9 18Z" fill="{{p.bg}}"/><circle cx="20" cy="20" r="20" fill="{{p.bg}}"/></svg>
<div style="position:absolute;left:0;right:0;top:{{p.gt}}px;display:flex;justify-content:center;color:{{p.fg}}"><svg width="{{p.g}}" height="{{p.g}}" viewBox="0 0 24 24" style="display:block"><use href="{{p.gref}}"/></svg></div>
<sc-if value="{{p.caper}}" hint-placeholder-val="{{false}}"><div style="position:absolute;top:1px;right:-1px;width:11px;height:11px;border-radius:999px;background:${S.flare};box-shadow:0 0 0 2px ${S.land}"></div></sc-if>
<sc-if value="{{p.showAv}}" hint-placeholder-val="{{false}}"><div style="position:absolute;left:-14px;top:-20px"><sc-if value="{{p.isRaccoon}}" hint-placeholder-val="{{true}}"><img src="critter-raccoon.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{p.isPossum}}" hint-placeholder-val="{{false}}"><img src="critter-possum.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{p.isSquirrel}}" hint-placeholder-val="{{false}}"><img src="critter-squirrel.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{p.isSkunk}}" hint-placeholder-val="{{false}}"><img src="critter-skunk.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if></div></sc-if>
</div></sc-if></div></sc-for></div>`;

const controls = `<div style="position:absolute;right:16px;top:288px;display:flex;flex-direction:column;gap:14px;align-items:flex-end">
<div style="width:52px;border-radius:16px;background:${S.paper};box-shadow:${K.SHADOW};color:${S.ink2}">
<div onClick="{{zoomIn}}" style="height:52px;display:flex;align-items:center;justify-content:center">${K.icPlus}</div>
<div style="height:1px;background:${S.hair};margin:0 10px"></div>
<div onClick="{{zoomOut}}" style="height:52px;display:flex;align-items:center;justify-content:center">${K.icMinus}</div></div>
<div onClick="{{recenter}}">${K.sqBtn(K.icNav)}</div></div>`;

const chipsI = `<div style="display:flex;align-items:center;height:62px;flex:none">
<div style="position:relative;flex:1;overflow:hidden;height:46px"><div style="display:flex;gap:9px;padding-left:20px;height:46px">
<sc-for list="{{chips}}" as="c" hint-placeholder-count="8">
<sc-if value="{{c.isRule}}" hint-placeholder-val="{{false}}"><div style="width:1px;height:28px;background:${S.hair};flex:none;margin:9px 3px 0"></div></sc-if>
<sc-if value="{{c.isChip}}" hint-placeholder-val="{{true}}">
<div onClick="{{c.pick}}" style="height:46px;border-radius:23px;display:flex;align-items:center;gap:{{c.gap}}px;padding:{{c.pad}};background:{{c.bg}};border:1.5px solid {{c.bd}};color:{{c.fg}};flex:none;transition:{{motion.tap}}">
<sc-if value="{{c.isEveryone}}" hint-placeholder-val="{{true}}"><div style="display:flex">
<sc-for list="{{c.stack}}" as="s" hint-placeholder-count="3"><div style="margin-left:{{s.ml}}px"><sc-if value="{{s.isRaccoon}}" hint-placeholder-val="{{true}}"><img src="critter-raccoon.png" alt="" style="width:32px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{s.isPossum}}" hint-placeholder-val="{{false}}"><img src="critter-possum.png" alt="" style="width:32px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{s.isSquirrel}}" hint-placeholder-val="{{false}}"><img src="critter-squirrel.png" alt="" style="width:32px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{s.isSkunk}}" hint-placeholder-val="{{false}}"><img src="critter-skunk.png" alt="" style="width:32px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if></div></sc-for></div></sc-if>
<sc-if value="{{c.isToday}}" hint-placeholder-val="{{false}}"><svg width="19" height="19" viewBox="0 0 24 24" style="display:block;color:{{c.sparkle}}"><use href="#g-spark"/></svg></sc-if>
<sc-if value="{{c.isPerson}}" hint-placeholder-val="{{false}}"><div style="display:flex"><sc-if value="{{c.isRaccoon}}" hint-placeholder-val="{{true}}"><img src="critter-raccoon.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{c.isPossum}}" hint-placeholder-val="{{false}}"><img src="critter-possum.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{c.isSquirrel}}" hint-placeholder-val="{{false}}"><img src="critter-squirrel.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{c.isSkunk}}" hint-placeholder-val="{{false}}"><img src="critter-skunk.png" alt="" style="width:34px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if></div></sc-if>
<sc-if value="{{c.isCat}}" hint-placeholder-val="{{false}}"><svg width="19" height="19" viewBox="0 0 24 24" style="display:block;color:{{c.sparkle}}"><use href="{{c.gref}}"/></svg></sc-if>
<span style="font-size:15px;font-weight:{{c.weight}}">{{c.label}}</span></div></sc-if>
</sc-for></div>
<div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:linear-gradient(90deg,rgba(251,250,246,0),${S.paper})"></div></div>
<div style="padding:0 16px 0 6px"><div onClick="{{add}}" style="width:46px;height:46px;flex:none;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center">${K.icPlus}</div></div></div>`;

const rowsI = `<div id="rk-list" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch">
<sc-for list="{{rows}}" as="r" hint-placeholder-count="4">
<div id="row-{{r.id}}" onClick="{{r.pick}}" style="display:flex;align-items:center;gap:14px;height:80px;padding:0 20px 0 {{r.padL}}px;background:{{r.bg}};border-bottom:1px solid {{r.bd}};position:relative;transition:{{motion.tap}}">
<sc-if value="{{r.sel}}" hint-placeholder-val="{{false}}"><div style="position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:0 3px 3px 0;background:${S.flare}"></div></sc-if>
<div style="width:56px;height:56px;flex:none;border-radius:17px;background:${S.sunk};display:flex;align-items:center;justify-content:center;color:${S.ink}"><svg width="25" height="25" viewBox="0 0 24 24" style="display:block"><use href="{{r.gref}}"/></svg></div>
<div style="flex:1;min-width:0">
<div style="font-family:${D};font-size:18px;font-weight:600;letter-spacing:-.1px;color:${S.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{r.name}}</div>
<div style="font-size:13px;font-weight:500;color:${S.muted};margin-top:1px">{{r.meta}}</div>
<div style="font-size:14px;font-weight:500;color:${S.ink2};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{r.blurb}}</div></div>
<div style="display:flex;flex:none"><sc-if value="{{r.isRaccoon}}" hint-placeholder-val="{{true}}"><img src="critter-raccoon.png" alt="" style="width:44px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{r.isPossum}}" hint-placeholder-val="{{false}}"><img src="critter-possum.png" alt="" style="width:44px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{r.isSquirrel}}" hint-placeholder-val="{{false}}"><img src="critter-squirrel.png" alt="" style="width:44px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if><sc-if value="{{r.isSkunk}}" hint-placeholder-val="{{false}}"><img src="critter-skunk.png" alt="" style="width:44px;height:auto;display:block;filter:drop-shadow(0 1px 2px rgba(36,35,33,.18))"/></sc-if></div></div>
</sc-for>
<sc-if value="{{empty}}" hint-placeholder-val="{{false}}">
<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:36px 28px"><svg width="34" height="32" viewBox="0 0 30 28" style="display:block;color:${S.hair}"><use href="#p-paw"/></svg>${K.hint('{{emptyLine}}', 'text-align:center;color:'+S.ink2)}</div></sc-if>
<sc-if value="{{atEnd}}" hint-placeholder-val="{{true}}">
<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 0"><svg width="32" height="30" viewBox="0 0 30 28" style="display:block;color:${S.hair}"><use href="#p-paw"/></svg>${K.hint("that's the whole stash.")}</div></sc-if></div>`;

const body = `<div style="position:relative;width:390px;height:844px;overflow:hidden;background:${S.land};font-family:${F};color:${S.ink};-webkit-font-smoothing:antialiased">
${K.SPRITES}${mapLayer}${K.grain(.5)}${K.vignette}
${K.screenHeader('Toronto Shenanigans','Places')}
${controls}
<div style="position:absolute;left:0;right:0;top:{{sheet.top}}px;bottom:${K.TABH}px;background:${S.glass};-webkit-backdrop-filter:blur(20px) saturate(110%);backdrop-filter:blur(20px) saturate(110%);border-radius:28px 28px 0 0;box-shadow:0 -1px 0 ${S.glassRim},${S.glassDepth},0 -20px 50px rgba(36,35,33,.12);overflow:hidden;display:flex;flex-direction:column;transition:{{motion.sheet}}">
${K.grain(.35)}
<div onPointerDown="{{handleDown}}" role="button" aria-label="Move the sheet" style="padding:10px 0 12px;flex:none;touch-action:none;cursor:grab;position:relative"><div style="width:44px;height:5px;border-radius:3px;background:{{handleColour}};margin:0 auto;transition:{{motion.tap}}"></div></div>
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 20px 16px;flex:none;position:relative">
<div><div style="font-family:${K.MONO};font-size:12px;font-weight:500;letter-spacing:.14em;color:${S.muted}">{{kicker}}</div><div style="height:6px"></div><div style="font-family:${D};font-size:28px;font-weight:600;letter-spacing:-.22px;line-height:1.12;color:${S.ink}">{{headline}}</div></div>
<sc-if value="{{isOpen}}" hint-placeholder-val="{{true}}">${K.seg('Nearby','Date')}</sc-if></div>
<sc-if value="{{isPeek}}" hint-placeholder-val="{{false}}"><div style="padding:0 20px;position:relative">${K.hint('pull up for the list')}</div></sc-if>
<sc-if value="{{isOpen}}" hint-placeholder-val="{{true}}">${chipsI}<div style="height:1px;background:${S.hair};flex:none;margin-top:4px"></div>${rowsI}</sc-if>
</div>
<div style="position:absolute;left:250px;top:{{rascal.top}}px;transition:{{motion.sheet}};pointer-events:none;z-index:3"><img src="rascal-peek.png" alt="Rascal" style="width:112px;height:auto;display:block;opacity:{{rascal.o}};transition:{{motion.tap}}"/></div>
${K.tabbar('Places')}</div>`;

const logic = `<script data-dc-script data-props='{"reduceMotion":{"editor":"boolean","default":false,"section":"Motion"},"$preview":{"width":390,"height":844}}'>
var PLACES = ${JSON.stringify(K.PLACES)};
var WHO = ${JSON.stringify(K.WHO)};
var NAME = ${JSON.stringify(K.NAME)};
var CATLABEL = ${JSON.stringify(K.CATLABEL)};
var AVBG = ${JSON.stringify(K.AVBG)};
var TOPS = [624, 365, 91];
function withFlags(o, person) {
  var w = WHO[person];
  o.isRaccoon = w === 'raccoon'; o.isPossum = w === 'possum';
  o.isSquirrel = w === 'squirrel'; o.isSkunk = w === 'skunk';
  return o;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { detent: 1, filter: null, cat: null, sel: 's1', z: 1, mx: 0, my: 0, drag: null };
    this._moved = false;
  }
  rm() {
    if (this.props.reduceMotion) return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  componentDidUpdate(pp, ps) {
    if (ps.sel !== this.state.sel && this.state.sel) {
      var el = document.getElementById('row-' + this.state.sel);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: this.rm() ? 'auto' : 'smooth' });
    }
  }
  handleDown(e) {
    var self = this, y0 = e.clientY, t0 = TOPS[self.state.detent], moved = false, last = t0;
    function mv(ev) {
      if (Math.abs(ev.clientY - y0) > 3) moved = true;
      last = Math.max(91, Math.min(624, t0 + (ev.clientY - y0)));
      self.setState({ drag: last });
    }
    function up() {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      if (!moved) { self.setState({ drag: null, detent: (self.state.detent + 1) % 3 }); return; }
      var best = 0, bd = 1e9;
      for (var i = 0; i < 3; i++) { var d = Math.abs(TOPS[i] - last); if (d < bd) { bd = d; best = i; } }
      self.setState({ drag: null, detent: best });
    }
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  }
  mapDown(e) {
    var self = this, x0 = e.clientX, y0 = e.clientY, mx = self.state.mx, my = self.state.my;
    self._moved = false;
    function mv(ev) {
      if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 5) self._moved = true;
      self.setState({ mx: mx + (ev.clientX - x0), my: my + (ev.clientY - y0) });
    }
    function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  }
  zoom(f) {
    var z0 = this.state.z, z = Math.max(0.7, Math.min(2.2, z0 * f)), cx = 195, cy = 280;
    this.setState({ z: z, mx: cx - (cx - this.state.mx) * (z / z0), my: cy - (cy - this.state.my) * (z / z0) });
  }
  pick(p) {
    if (this._moved) { this._moved = false; return; }
    if (this.state.sel === p.id) { this.setState({ sel: null }); return; }
    var d = this.state.detent === 0 ? 1 : this.state.detent, z = this.state.z;
    this.setState({ sel: p.id, detent: d, mx: 195 - p.x * z, my: TOPS[d] * 0.5 - p.y * z });
  }
  renderVals() {
    var self = this, st = this.state, rm = this.rm();
    var top = st.drag != null ? st.drag : TOPS[st.detent];
    var open = top < 560;
    var motion = rm
      ? { sheet: 'none', pin: 'none', map: 'none', tap: 'none' }
      : { sheet: (st.drag != null ? 'none' : 'top 280ms cubic-bezier(.22,.61,.36,1)'),
          pin: 'left 130ms ease-out, top 130ms ease-out',
          map: 'transform 320ms cubic-bezier(.22,.61,.36,1)',
          tap: 'background-color 130ms ease-out, border-color 130ms ease-out, opacity 200ms ease-out' };

    // one dimming rule: a pin collapses to a dot when the person OR the category filter excludes it
    function excluded(p) {
      return (st.filter != null && st.filter !== 'today' && p.by !== st.filter) || (st.cat != null && p.cat !== st.cat);
    }
    var pins = PLACES.map(function (p) {
      var sel = st.sel === p.id, dim = excluded(p);
      var w = sel ? 52 : 40, h = Math.round(w * 52 / 40), g = Math.round(w * 0.55);
      var o = {
        left: dim ? p.x - 7 : p.x - w / 2, top: dim ? p.y - 14 : p.y - h,
        w: w, h: h, g: g, gt: Math.round(w * 0.5 - g / 2), gref: '#g-' + p.cat,
        dim: dim, show: !dim,
        bg: sel ? '#FF6846' : '#242321', fg: sel ? '#242321' : '#FBFAF6',
        shadow: sel ? 'drop-shadow(0 5px 9px rgba(36,35,33,.26))' : 'drop-shadow(0 2px 4px rgba(36,35,33,.18))',
        caper: !sel && p.going.length >= 3,
        showAv: !dim && st.filter != null && st.filter !== 'today' && p.by === st.filter,
        pick: function () { self.pick(p); }
      };
      return withFlags(o, p.by);
    });

    var people = ['mia', 'josh', 'zoe'];
    var defs = [{ kind: 'everyone', key: null, label: 'Everyone' }, { kind: 'today', key: 'today', label: 'Today' }]
      .concat(people.map(function (k) { return { kind: 'person', key: k, label: NAME[k] }; }))
      .concat([{ kind: 'rule' }])
      .concat(['eat', 'drink', 'do'].map(function (k) { return { kind: 'cat', key: k, label: CATLABEL[k] }; }));
    var chips = defs.map(function (c) {
      if (c.kind === 'rule') return { isRule: true, isChip: false, stack: [] };
      var on = c.kind === 'everyone' ? st.filter == null : (c.kind === 'cat' ? st.cat === c.key : st.filter === c.key);
      var pad = c.kind === 'everyone' ? '0 18px 0 6px' : (c.kind === 'person' ? '0 18px 0 7px' : (c.kind === 'cat' ? '0 18px 0 15px' : '0 18px'));
      var o = {
        isRule: false, isChip: true,
        label: c.label, pad: pad, gap: (c.kind === 'today' || c.kind === 'cat') ? 8 : 9,
        isEveryone: c.kind === 'everyone', isToday: c.kind === 'today', isPerson: c.kind === 'person', isCat: c.kind === 'cat',
        gref: c.kind === 'cat' ? '#g-' + c.key : '',
        weight: c.kind === 'everyone' ? 700 : 600,
        bg: on ? '#FF6846' : '#FBFAF6', bd: on ? '#FF6846' : '#E5E0D4', fg: on ? '#242321' : '#5E594F',
        sparkle: on ? '#242321' : '#8A8478',
        stack: ['amelia', 'mia', 'josh'].map(function (p, i) {
          return withFlags({ ml: i ? -13 : 0 }, p);
        }),
        pick: c.kind === 'cat'
          ? function () { self.setState({ cat: on ? null : c.key, sel: null, detent: st.detent === 0 ? 1 : st.detent }); }
          : function () { self.setState({ filter: on ? null : c.key, sel: null, detent: st.detent === 0 ? 1 : st.detent }); }
      };
      return withFlags(o, (c.kind === 'person') ? c.key : 'amelia');
    });

    // person AND category compose; Today is a projection of the same list (three or more want to go)
    var visible = PLACES.filter(function (p) {
      if (excluded(p)) return false;
      if (st.filter === 'today' && p.going.length < 3) return false;
      return true;
    });
    var rows = visible.map(function (p) {
      var sel = st.sel === p.id;
      var o = {
        id: p.id, name: p.name, blurb: p.blurb, meta: p.hood + ' \\u00b7 ' + p.km,
        gref: '#g-' + p.cat, sel: sel,
        bg: sel ? '#FFE9E2' : 'transparent', bd: sel ? 'transparent' : '#E5E0D4', padL: sel ? 16 : 20,
        pick: function () { self.pick(p); }
      };
      return withFlags(o, p.by);
    });

    var who = st.filter && st.filter !== 'today' ? NAME[st.filter] : null;
    var catWord = st.cat ? CATLABEL[st.cat].toLowerCase() : null;
    var kicker = who ? (who + "'s " + (catWord || 'picks'))
      : (st.filter === 'today' ? 'happening today' + (catWord ? ' · ' + catWord : '')
      : (catWord ? catWord + ' in the stash' : 'your shared stash'));
    // Rascal's line for an empty list — lowercase, first person, one sentence
    var emptyLine = who && catWord ? who.toLowerCase() + " hasn't saved any " + catWord + " yet."
      : who ? who.toLowerCase() + " hasn't saved anything yet."
      : catWord ? 'no ' + catWord + ' saved yet.'
      : st.filter === 'today' ? "nothing's turning into a plan yet."
      : 'nothing saved yet.';
    return {
      sheet: { top: Math.round(top) }, map: { x: Math.round(st.mx), y: Math.round(st.my), z: st.z },
      rascal: { top: Math.round(top) - 90, o: open ? 0 : 1 },
      motion: motion, pins: pins, chips: chips, rows: rows,
      isOpen: open, isPeek: !open, empty: rows.length === 0, atEnd: rows.length > 0, emptyLine: emptyLine,
      handleColour: st.drag != null ? '#8A8478' : '#E5E0D4',
      kicker: kicker.toUpperCase(),
      headline: rows.length === 0 ? 'nothing here' : rows.length + (rows.length === 1 ? ' good idea' : ' good ideas'),
      zoomIn: function () { self.zoom(1.4); },
      zoomOut: function () { self.zoom(1 / 1.4); },
      recenter: function () { self.setState({ z: 1, mx: 0, my: 0 }); },
      add: function () { self.setState({ detent: 1 }); },
      handleDown: function (e) { self.handleDown(e); },
      mapDown: function (e) { self.mapDown(e); }
    };
  }
}
</` + `script>`;

export const MAIN = K.doc(body, logic);
