/**
 * The real adapter. Uses @ruckus/api for accounts, Dens and the Stash, and
 * @ruckus/ingest through the proxy to resolve reels. It also converts backend
 * rows to the app's types. No other file in the app imports either package.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createRuckus, DenRow, MemberRow, StashRow } from '@ruckus/api';
import { ExtractResult, ResolvedPlace, extractFromReel, searchPlaces } from '@ruckus/ingest';
import { Api, ResolveResult } from './types';
import { cleanLink } from '../lib/links';
import { parseDay } from '../lib/time';
import { Category, Critter, Den, Member, PlaceCandidate, StashItem } from '../types';

const env = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  proxy: process.env.EXPO_PUBLIC_PROXY_URL ?? '',
};

const ruckus = createRuckus({ url: env.url, anonKey: env.anonKey, storage: AsyncStorage });

const CRITTERS: Critter[] = ['raccoon', 'possum', 'squirrel', 'skunk', 'chipmunk', 'pigeon', 'fox', 'crow'];
const toCritter = (avatar: string | null | undefined): Critter =>
  (CRITTERS as string[]).includes(avatar ?? '') ? (avatar as Critter) : 'raccoon';

const toMember = (m: MemberRow): Member => ({
  userId: m.id, displayName: m.display_name || 'Someone', critter: toCritter(m.avatar),
  role: m.role === 'owner' ? 'owner' : 'member',
});

async function toDen(d: DenRow): Promise<Den> {
  const members = await ruckus.dens.members(d.id);
  return { id: d.id, name: d.name, emblem: d.crest ?? 'lantern', members: members.map(toMember) };
}

/**
 * Maps the backend's free-text category (for example "specialty coffee") to
 * eat, drink or do. `kind` is checked first, then keywords.
 */
export function toCategory(kind: StashRow['kind'], text: string | null | undefined): Category {
  if (kind === 'trail' || kind === 'region' || kind === 'event') return 'do';
  const t = (text ?? '').toLowerCase();
  if (DRINK.test(t)) return 'drink';
  if (EAT.test(t)) return 'eat';
  if (DO.test(t)) return 'do';
  return kind === 'venue' ? 'eat' : 'do';
}

/**
 * These match whole words, so "theater" does not match "eat". Food is tested
 * before places so that "coffee shop" maps to eat.
 */
const DRINK = /\b(bars?|pubs?|brew\w*|wine\w*|cocktails?|beer\w*|lounges?|night ?clubs?|sake|taprooms?|cider\w*|distill\w*|speakeasy|izakaya)\b/;
const EAT = /\b(caf[eé]s?|coffee|restaurants?|food|ramen|pizza\w*|baker\w*|tacos?|sushi|bbq|diners?|bistros?|kitchens?|eatery|desserts?|ice cream|gelato|brunch|breakfast|noodles?|dumplings?|grills?|burgers?|patisserie|tea|deli\w*|butchers?|markets?|meal|sandwich\w*|donuts?|juice|steak\w*|seafood)\b/;
const DO = /\b(parks?|trails?|museums?|gallery|galleries|beach\w*|gardens?|lakes?|zoo|theaters?|theatres?|cinemas?|gyms?|stadiums?|attractions?|playgrounds?|library|campgrounds?|spa|parking|malls?|shopping|stores?|shops?|airports?|stations?|embassy|consulate|hotels?)\b/;

const formatDistance = (m: number | null) =>
  m == null ? '' : m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;

function toStashItem(r: StashRow, denId: string): StashItem | null {
  if (!r.coordinate) return null;   // A row without a coordinate cannot be pinned.
  return {
    id: r.placeId,
    denId,
    savedBy: r.savers[0]?.id ?? '',
    savers: r.savers.map(x => x.id),
    placeId: r.placeId,
    name: r.name,
    neighbourhood: r.neighbourhood ?? r.city ?? '',
    category: toCategory(r.kind, r.category),
    lat: r.coordinate.lat,
    lng: r.coordinate.lng,
    sourceUrl: r.sourceUrls[0] ?? null,
    savedAt: r.firstSavedAt,
    wantCount: r.wantCount,
    iWant: r.iWant,
    interested: (r.wanters ?? []).map(w => w.id),
    note: r.note ?? '',
    noteBy: r.noteBy ?? null,
    distance: formatDistance(r.distanceM),
    distanceM: r.distanceM ?? null,
    when: r.when ?? null,
    headline: r.headline ?? null,
    address: r.address ?? undefined,
    takes: r.takes,
  };
}

/* ------------------------------------------------------------ resolve -- */

/**
 * The last resolve, keyed by place id. `stash.save` needs the ResolvedPlace
 * objects exactly as ingest returned them, and `confirmations.log` needs the
 * offered list and the chosen index.
 */
let lastResolve: { result: ExtractResult; byId: Map<string, ResolvedPlace> } | null = null;

/**
 * Search results are cached separately from the last resolve, so a search can
 * be saved without a link having been resolved first.
 */
const searched = new Map<string, ResolvedPlace>();


function toCandidate(p: ResolvedPlace): PlaceCandidate | null {
  if (!p.googlePlaceId || !p.coordinate) return null;
  return {
    placeId: p.googlePlaceId,
    name: p.name,
    address: p.address ?? p.neighbourhood ?? p.city ?? '',
    lat: p.coordinate.lat,
    lng: p.coordinate.lng,
    category: toCategory(p.kind, p.category),
    reason: p.explanation?.text,
    headline: p.headline ?? null,
    when: p.when ?? null,
    tier: p.tier,
  };
}

async function accessToken() {
  const { data } = await ruckus.supabase.auth.getSession();
  return data.session?.access_token;
}

/** A token hash for the review account, or null for everyone else. */
async function reviewTokenHash(email: string, code: string): Promise<{ tokenHash: string; type: string } | null> {
  if (!env.proxy) return null;
  try {
    const r = await fetch(`${env.proxy}/auth/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const ingestOpts = async () => ({
  endpoint: `${env.proxy}/extract`,
  geocodeEndpoint: `${env.proxy}/geocode`,
  accessToken: await accessToken(),
});

/* ---------------------------------------------------------------- api -- */

export const ruckusApi: Api = {
  auth: {
    sendCode: (email, displayName) => ruckus.auth.sendCode(email, { displayName }),
    async verifyCode(email, code) {
      try {
        return await ruckus.auth.verifyCode(email, code);
      } catch (err) {
        if ((err as { code?: string }).code !== 'code_invalid') throw err;
        /** The App Review demo account: a fixed code the proxy checks. Anyone else gets the original error. */
        const hash = await reviewTokenHash(email, code);
        if (!hash) throw err;
        return ruckus.auth.verifyTokenHash(hash.tokenHash, hash.type);
      }
    },
    userId: () => ruckus.auth.userId(),
    async signOut() {
      lastResolve = null;
      searched.clear();
      await ruckus.auth.signOut();
    },
    async deleteAccount() {
      lastResolve = null;
      searched.clear();
      await ruckus.auth.deleteAccount();
    },
  },

  safety: {
    report: ({ denId, userId, placeId }) => ruckus.safety.report({ denId, profileId: userId, placeId: placeId ?? null }),
    block: userId => ruckus.safety.block(userId),
    unblock: userId => ruckus.safety.unblock(userId),
    async blocked() {
      const rows = await ruckus.safety.blocked();
      return rows.map(r => ({ userId: r.id, displayName: r.displayName || 'Someone', critter: toCritter(r.avatar) }));
    },
  },

  profile: {
    async update({ displayName, critter }) {
      await ruckus.profile.update({ displayName, avatar: critter });
    },
  },

  async myDens() {
    const rows = await ruckus.dens.mine();
    return Promise.all(rows.map(toDen));
  },
  createDen: async (name, emblem) => toDen(await ruckus.dens.create(name, emblem)),
  joinDen: async (code) => toDen(await ruckus.dens.join(code)),
  getCapacity: denId => ruckus.dens.capacity(denId),
  getDenAllowance: () => ruckus.dens.allowance(),
  getInviteLink: async denId => ({ code: await ruckus.dens.invite(denId) }),

  async getStash(denId, pos) {
    const rows = await ruckus.stash.list(denId, pos);
    return rows.map(r => toStashItem(r, denId)).filter((s): s is StashItem => s !== null);
  },
  onStashChange: (denId, cb) => ruckus.stash.onChange(denId, cb),

  async resolveSharedUrl(url): Promise<ResolveResult> {
    const result = await extractFromReel(url, await ingestOpts());
    const byId = new Map<string, ResolvedPlace>();
    for (const p of result.candidates) if (p.googlePlaceId) byId.set(p.googlePlaceId, p);
    lastResolve = { result, byId };
    const candidates = result.candidates.map(toCandidate).filter((c): c is PlaceCandidate => c !== null);
    return { candidates, mode: candidates.length ? result.confirmMode : 'search' };
  },

  async searchPlaces(query, { fromLink = false } = {}) {
    const q = query.trim();
    if (!q) return [];
    /** Returns every match, because the user picks from the list. */
    const city = fromLink ? lastResolve?.result.city ?? null : null;
    const places = await searchPlaces(q, { city }, await ingestOpts());
    for (const p of places) if (p.googlePlaceId) searched.set(p.googlePlaceId, p);
    return places.map(toCandidate).filter((c): c is PlaceCandidate => c !== null);
  },

  async saveToStash({ denId, placeIds, sourceUrl, dates = {} }) {
    const places = placeIds.map(id => lastResolve?.byId.get(id) ?? searched.get(id));
    if (places.some(p => !p)) throw new Error('place_missing_id');
    /** A typed day stands in for the date the link did not give. The words are kept as written; the day only when they read as one. */
    const picked = (places as ResolvedPlace[]).map(p => {
      const typed = p.googlePlaceId ? dates[p.googlePlaceId] : undefined;
      return typed ? { ...p, when: { text: typed, start: parseDay(typed), end: null, recurring: null } } : p;
    });
    await ruckus.stash.save({ denId, places: picked, sourceUrl: cleanLink(sourceUrl) ?? picked[0].sourceUrl });
    /**
     * Log a confirmation only when the save came from a link. A manual add has
     * no offered list, and logging it against the last resolve would record a
     * false "none of these".
     */
    if (lastResolve && sourceUrl) {
      const offered = lastResolve.result.candidates;
      const chosen = placeIds
        .map(id => offered.findIndex(p => p.googlePlaceId === id))
        .filter(index => index >= 0);
      ruckus.confirmations.log({
        mode: lastResolve.result.confirmMode, offered, chosen, engine: lastResolve.result.engine,
      }).catch(() => {});   // A failed log must not fail the save.
    }
    /**
     * Read the saved rows back by `googlePlaceId`. The ids here are Google's,
     * and a Stash row's own `placeId` is the database id. Retries once after
     * 700 ms if any row is missing.
     */
    const found = new Map<string, StashItem>();
    for (const wait of [0, 700]) {
      if (wait) await new Promise(r => setTimeout(r, wait));
      try {
        for (const row of await ruckus.stash.list(denId)) {
          if (!row.googlePlaceId || !placeIds.includes(row.googlePlaceId)) continue;
          const item = toStashItem(row, denId);
          if (item) found.set(row.googlePlaceId, item);
        }
        if (found.size === placeIds.length) break;
      } catch { /* The save already succeeded, so a failed read is ignored. */ }
    }

    /**
     * The save is already in the database, so this function must not throw
     * from here on. A row the read-back missed is built from the cached
     * place. The next Stash reload replaces it with the real row.
     */
    const me = (await ruckus.auth.userId()) ?? '';
    return placeIds.map((placeId, i) => found.get(placeId) ?? {
      id: placeId, denId, savedBy: me, savers: [me], placeId,
      name: picked[i].name,
      neighbourhood: picked[i].neighbourhood ?? picked[i].city ?? '',
      category: toCategory(picked[i].kind, picked[i].category),
      lat: picked[i].coordinate?.lat ?? 0, lng: picked[i].coordinate?.lng ?? 0,
      sourceUrl: sourceUrl ?? null, savedAt: new Date().toISOString(),
      wantCount: 0, iWant: false, interested: [],
      note: '', takes: [], distance: '', address: picked[i].address ?? undefined,
    });
  },

  async setWant(denId, placeId, want) {
    await ruckus.stash.setWant(denId, placeId, want);
  },

  removeFromStash: (denId, placeId) => ruckus.stash.removePlace(denId, placeId),
  getCapers: denId => ruckus.capers.list(denId),
  async createCaper({ denId, placeId, date, time, going }) {
    const caper = await ruckus.capers.make({ denId, placeId, date, time, going });
    if (!caper) throw new Error('caper_failed');
    return caper;
  },

  async syncPro() {
    const token = await accessToken();
    if (!token || !env.proxy) return false;
    try {
      const r = await fetch(`${env.proxy}/pro/sync`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? Boolean((await r.json()).isPro) : false;
    } catch {
      return false;   // the webhook still gets there; this is only the fast path
    }
  },
  notifications: {
    registerPushToken: (token, platform) => ruckus.notifications.registerPushToken(token, platform),
    unregisterPushToken: token => ruckus.notifications.unregisterPushToken(token),
  },

  // One take per person per place, so add and update are the same write.
  // Other devices receive the change through onStashChange.
  async addTake(denId, placeId, text) { await ruckus.takes.set(denId, placeId, text); },
  async updateTake(denId, placeId, text) { await ruckus.takes.set(denId, placeId, text); },
  async deleteTake(denId, placeId) { await ruckus.takes.remove(denId, placeId); },
};
