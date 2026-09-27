import * as K from './parts-a.mjs';
const S = K.S, F = K.FONT, D = K.DISP;

const CAND = [
  { id:'p_dualcitizen', name:'Dual Citizen Coffee Bar', addr:'930 King St W, Toronto', note:'Matched from a tagged handle' },
  { id:'p_citizen2',    name:'Citizen Coffee',          addr:'412 Queen St W, Toronto', note:'Name is close' },
  { id:'p_dualcafe',    name:'Dual Café',               addr:'75 Ossington Ave, Toronto', note:'Name is close' },
];
const SEARCH = [
  { id:'p_dualcitizen', name:'Dual Citizen Coffee Bar', addr:'930 King St W' },
  { id:'p_dualcafe',    name:'Dual Café',               addr:'75 Ossington Ave' },
  { id:'p_citizen2',    name:'Citizen Coffee',          addr:'412 Queen St W' },
  { id:'p_barraval',    name:'Bar Raval',               addr:'505 College St' },
  { id:'p_sanagans',    name:"Sanagan's Meat Locker",   addr:'176 Baldwin St' },
];
const header = `<div style="display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 20px;flex:none"><div onClick="{{cancel}}" style="font-size:16px;font-weight:600;color:${S.ink2}">Cancel</div><div style="font-size:15px;font-weight:700;color:${S.ink}">Confirm</div><div style="width:56px"></div></div>`;

const body = `<div style="position:relative;width:390px;height:844px;overflow:hidden;background:${S.land};font-family:${F};color:${S.ink};-webkit-font-smoothing:antialiased">
${K.SPRITES}${K.mapSvg}${K.PLACES.slice(0,4).map(p=>K.drop(p,false)).join('')}${K.scrim}
<div style="position:absolute;left:0;right:0;top:${K.TOP}px;bottom:0;background:${S.paper};border-radius:28px 28px 0 0;box-shadow:0 -20px 44px rgba(36,35,33,.14);overflow:hidden;display:flex;flex-direction:column">
<div style="width:44px;height:5px;border-radius:3px;background:${S.hair};margin:10px auto 8px;flex:none"></div>

<sc-if value="{{isResolving}}" hint-placeholder-val="{{false}}">
<div style="flex:1;position:relative;padding:0 20px">
<div style="position:absolute;left:44px;top:150px;z-index:2">${K.rascal(180)}</div>
<div style="position:absolute;left:216px;top:132px;z-index:3">${K.bubble('{{sniffLine}}', {w:160, tail:'bl'})}</div>
<div style="position:absolute;left:20px;right:20px;top:372px">${K.mono('{{pctLabel}}', 13, S.ink2)}<div style="height:8px"></div><div style="height:2px;border-radius:1px;background:${S.hair}"><div style="width:{{pct}}%;height:2px;border-radius:1px;background:${S.flare};transition:{{motion.bar}}"></div></div></div>
<div style="position:absolute;left:20px;right:20px;top:420px">${K.hint("checking the tagged handle…")}</div></div></sc-if>

<sc-if value="{{isPicking}}" hint-placeholder-val="{{true}}">
${header}
<div style="flex:1;overflow:auto;padding:12px 20px 0">
<div style="margin-bottom:10px">${K.kicker('From the link you shared')}</div>
<div style="font-family:${D};font-size:30px;font-weight:600;letter-spacing:-.24px;line-height:1.12;color:${S.ink}">{{headline}}</div>
<div style="height:20px"></div>
<sc-for list="{{cards}}" as="c" hint-placeholder-count="1">
<div onClick="{{c.pick}}" style="border:{{c.border}};background:{{c.bg}};border-radius:20px;padding:17px;display:flex;gap:14px;align-items:flex-start;margin-bottom:11px;transition:{{motion.tap}}">
<div style="width:52px;height:52px;flex:none;border-radius:16px;background:${S.paper};display:flex;align-items:center;justify-content:center;color:${S.ink}"><svg width="24" height="24" viewBox="0 0 24 24" style="display:block"><use href="#g-eat"/></svg></div>
<div style="flex:1;min-width:0"><div style="font-family:${D};font-size:19px;font-weight:600;letter-spacing:-.15px;color:${S.ink}">{{c.name}}</div>
<div style="font-size:14px;color:${S.ink2};margin-top:4px">{{c.addr}}</div>
<div style="font-size:13px;color:${S.muted};margin-top:7px">{{c.note}}</div></div>
<sc-if value="{{c.on}}" hint-placeholder-val="{{true}}"><div style="width:26px;height:26px;flex:none;border-radius:999px;background:${S.flare};color:${S.ink};display:flex;align-items:center;justify-content:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M4.5 12.6 9.5 17.5 19.5 6.8"/></svg></div></sc-if></div>
</sc-for>
<sc-if value="{{collapsed}}" hint-placeholder-val="{{true}}">
<div onClick="{{expand}}" style="height:54px;border-radius:16px;border:1.5px solid ${S.hair};display:flex;align-items:center;justify-content:space-between;padding:0 18px;color:${S.ink2};font-size:15px;font-weight:600">Not right? See 2 other matches<span style="color:${S.muted}">${K.chevD}</span></div></sc-if>
<div onClick="{{toSearch}}">${K.textBtn('None of these — search for it', S.muted)}</div>
<div style="height:12px"></div></div>
<div style="flex:none;border-top:1px solid ${S.hair};background:${S.paper};padding:14px 20px ${K.BOT}px">
<div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 13px">${K.kicker('Saving to')}
<div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:${S.ink}">${K.emblem('lantern',22)}Toronto Shenanigans<span style="color:${S.muted}">${K.chevD}</span></div></div>
<div onClick="{{save}}" style="height:54px;border-radius:16px;background:${S.flare};color:${S.ink};font-size:17px;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;justify-content:center;opacity:{{saveOpacity}}">{{saveLabel}}</div></div>
</sc-if>

<sc-if value="{{isSearch}}" hint-placeholder-val="{{false}}">
${header}
<div style="padding:8px 20px 0;flex:none">${K.display('Search for it', 30)}
<div style="height:18px"></div>
<div style="height:56px;border-radius:16px;background:${S.paper};border:1.5px solid ${S.hair};display:flex;align-items:center;gap:11px;padding:0 16px"><span style="color:${S.muted}">${K.icSearch}</span>
<input value="{{query}}" onChange="{{onQuery}}" placeholder="Toronto" style="flex:1;font-size:16px;font-weight:500;color:${S.ink};min-width:0"/></div>
<div style="height:14px"></div></div>
<div style="flex:1;overflow:auto">
<sc-for list="{{results}}" as="r" hint-placeholder-count="3">
<div onClick="{{r.pick}}" style="display:flex;align-items:center;gap:14px;height:72px;padding:0 20px;border-bottom:1px solid ${S.hair}">
<div style="width:48px;height:48px;flex:none;border-radius:15px;background:${S.sunk};display:flex;align-items:center;justify-content:center;color:${S.ink}"><svg width="22" height="22" viewBox="0 0 24 24" style="display:block"><use href="#g-eat"/></svg></div>
<div style="flex:1;min-width:0"><div style="font-family:${D};font-size:17px;font-weight:600;letter-spacing:-.12px;color:${S.ink}">{{r.name}}</div><div style="font-size:13px;color:${S.muted};margin-top:2px">{{r.addr}}</div></div>
<span style="color:${S.muted}">${K.chevR}</span></div>
</sc-for>
<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 24px"><svg width="30" height="28" viewBox="0 0 30 28" style="display:block;color:${S.hair}"><use href="#p-paw"/></svg>${K.hint('nothing? type the details in by hand.', 'text-align:center')}</div></div>
</sc-if>

<sc-if value="{{isSaved}}" hint-placeholder-val="{{false}}">
<div style="flex:1;display:flex;flex-direction:column;padding:0 24px ${K.BOT}px">
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center">
<div style="position:relative;width:340px;height:330px">
<div style="position:absolute;left:0;right:0;top:0;text-align:center;font-family:${D};font-size:56px;font-weight:600;letter-spacing:-.45px;line-height:1;color:${S.ink}">In the Stash</div>
<div style="position:absolute;left:58px;top:36px;z-index:2">${K.rascal(220)}</div>
<div style="position:absolute;left:206px;top:-18px;z-index:3">${K.bubble("saved to the stash.", {w:150, tail:'bl'})}</div></div>
<div style="font-size:16px;line-height:23px;color:${S.ink2};text-align:center;margin-top:-40px;text-wrap:pretty;max-width:290px">{{savedName}} is on the map for Toronto Shenanigans.</div></div>
<div onClick="{{seeMap}}">${K.btn('See it on the map')}</div><div onClick="{{again}}">${K.textBtn('Add another')}</div></div>
</sc-if>
</div></div>`;

const logic = `<script data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
var CAND = ${JSON.stringify(CAND)};
var SEARCH = ${JSON.stringify(SEARCH)};
// Rascal's lines while a link resolves — one is picked per run
var SNIFF = ['reading the link…', "checking the tagged handle…", "matching the place…"];

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { mode: 'resolving', picked: 'p_dualcitizen', expanded: false, query: '', savedName: '', pct: 0, sniff: 0 };
  }
  // the loader ritual: a number that climbs to 92 and holds, then snaps to 100 when the answer lands
  componentDidMount() {
    var s = this;
    this.setState({ pct: 0, sniff: Math.floor(Math.random() * SNIFF.length) });
    this._i = setInterval(function () { s.setState({ pct: Math.min(92, s.state.pct + 3) }); }, 40);
    this._t = setTimeout(function () { clearInterval(s._i); s.setState({ pct: 100 }); s._t = setTimeout(function () { s.setState({ mode: 'pick' }); }, 140); }, 1400);
  }
  componentWillUnmount() { clearTimeout(this._t); clearInterval(this._i); }
  rm() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  save() {
    if (this.state.mode === 'saving') return;
    var s = this, name = '';
    CAND.concat(SEARCH).forEach(function (c) { if (c.id === s.state.picked) name = c.name; });
    this.setState({ mode: 'saving' });
    this._t = setTimeout(function () { s.setState({ mode: 'saved', savedName: name }); }, 650);
  }
  renderVals() {
    var s = this, st = this.state;
    var shown = st.expanded ? CAND : CAND.slice(0, 1);
    var q = st.query.trim().toLowerCase();
    var results = SEARCH.filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) >= 0; });
    return {
      isResolving: st.mode === 'resolving',
      isPicking: st.mode === 'pick' || st.mode === 'saving',
      isSearch: st.mode === 'search',
      isSaved: st.mode === 'saved',
      headline: st.expanded ? 'Which one did you mean?' : 'Think I found it',
      collapsed: !st.expanded,
      motion: { tap: this.rm() ? 'none' : 'background-color 130ms ease-out, border-color 130ms ease-out', bar: this.rm() ? 'none' : 'width 40ms linear' },
      pct: st.pct, pctLabel: 'SNIFFING \\u00b7 ' + st.pct + '%', sniffLine: SNIFF[st.sniff],
      cards: shown.map(function (c) {
        var on = st.picked === c.id;
        return { name: c.name, addr: c.addr, note: c.note, on: on,
          border: on ? '2px solid #FF6846' : '1.5px solid #E5E0D4',
          bg: on ? '#FFE9E2' : '#FBFAF6',
          pick: function () { s.setState({ picked: c.id }); } };
      }),
      query: st.query,
      results: results.map(function (r) {
        return { name: r.name, addr: r.addr,
          pick: function () { s.setState({ mode: 'pick', picked: r.id, expanded: false }); } };
      }),
      savedName: st.savedName,
      saveLabel: st.mode === 'saving' ? 'Saving…' : 'Add to Stash',
      saveOpacity: st.mode === 'saving' ? 0.55 : 1,
      onQuery: function (e) { s.setState({ query: e.target.value }); },
      expand: function () { s.setState({ expanded: true }); },
      toSearch: function () { s.setState({ mode: 'search', query: '' }); },
      cancel: function () { s.setState({ mode: 'pick', expanded: false, query: '' }); },
      save: function () { s.save(); },
      again: function () { clearTimeout(s._t); clearInterval(s._i); s.setState({ mode: 'resolving', expanded: false, picked: 'p_dualcitizen' }); s.componentDidMount(); },
      seeMap: function () { s.setState({ mode: 'pick' }); }
    };
  }
}
</` + `script>`;

export const CONFIRM = K.doc(body, logic);
