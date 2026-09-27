/**
 * The real adapter: @ruckus/api over Supabase for accounts, Dens and the
 * Stash; @ruckus/ingest through the proxy for reel → places. This file is
 * the only place in the app that knows either package exists.
 *
 * Shape translation lives here too. The backend returns one row per place
 * with everyone who saved it; the app's StashItem is that row with the
 * first saver as `savedBy`, `distanceM` formatted, and his free-text
 * category folded into eat / drink / do for the pin glyph.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createRuckus, DenRow, MemberRow, StashRow } from '@ruckus/api';
import { ExtractResult, ResolvedPlace, extractFromReel, geocodeCandidates } from '@ruckus/ingest';
import { Api, ResolveResult } from './types';
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
});

async function toDen(d: DenRow): Promise<Den> {
  const members = await ruckus.dens.members(d.id);
  return { id: d.id, name: d.name, emblem: d.crest ?? 'lantern', members: members.map(toMember) };
}

/**
 * The backend's category is whatever the model wrote ("specialty coffee");
 * the pin needs one of three glyphs. Kind decides first, then keywords.
 */
export function toCategory(kind: StashRow['kind'], text: string | null | undefined): Category {
  if (kind === 'trail' || kind === 'region' || kind === 'event') return 'do';
  const t = (text ?? '').toLowerCase();
  if (/\b(bar|pub|brew|wine|cocktail|beer|drink|lounge|club|sake|taproom|cider|distill)/.test(t)) return 'drink';
  if (/(caf|coffee|restaurant|food|ramen|pizza|baker|taco|sushi|bbq|diner|bistro|kitchen|eat|dessert|ice cream|gelato|brunch|noodle|dumpling|grill|burger|patisserie|tea|deli|butcher|market)/.test(t)) return 'eat';
  return kind === 'venue' ? 'eat' : 'do';
}

const formatDistance = (m: number | null) =>
  m == null ? '' : m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;

function toStashItem(r: StashRow, denId: string): StashItem | null {
  if (!r.coordinate) return null;   // can't be pinned; the backend routed it to search anyway
  return {
    id: r.placeId,
    denId,
    savedBy: r.savers[0]?.id ?? '',
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
    distance: formatDistance(r.distanceM),
    address: r.address ?? undefined,
    takes: r.takes,
  };
}

/* ------------------------------------------------------------ resolve -- */

/**
 * stash.save wants the ResolvedPlace objects back exactly as ingest returned
 * them, so the last resolve is kept here keyed by place id. confirmations.log
 * wants the whole offered list and the chosen index — same cache.
 */
let lastResolve: { result: ExtractResult; byId: Map<string, ResolvedPlace> } | null = null;

const tierConfidence = { high: 0.9, medium: 0.6, low: 0.3 } as const;

function toCandidate(p: ResolvedPlace): PlaceCandidate | null {
  if (!p.googlePlaceId || !p.coordinate) return null;
  return {
    placeId: p.googlePlaceId,
    name: p.name,
    address: p.address ?? p.neighbourhood ?? p.city ?? '',
    lat: p.coordinate.lat,
    lng: p.coordinate.lng,
    category: toCategory(p.kind, p.category),
    confidence: tierConfidence[p.tier],
    reason: p.explanation?.text,
  };
}

async function accessToken() {
  const { data } = await ruckus.supabase.auth.getSession();
  return data.session?.access_token;
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
    verifyCode: (email, code) => ruckus.auth.verifyCode(email, code),
    userId: () => ruckus.auth.userId(),
    signOut: () => ruckus.auth.signOut(),
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
  getInviteLink: async (denId) => {
    const code = await ruckus.dens.invite(denId);
    return { code, url: `https://ruckus.app/j/${code}` };
  },

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
    /** Itinerary reels want a pick-several screen the app doesn't have yet; offer them one at a time. */
    const mode = result.confirmMode === 'multi' ? 'choose' : result.confirmMode;
    return { candidates, mode: candidates.length ? mode : 'search' };
  },

  async searchPlaces(query) {
    const q = query.trim();
    if (!q) return [];
    const places = await geocodeCandidates(
      [{ name: q, kind: 'venue', score: 0, reasons: [] }],
      { city: lastResolve?.result.city ?? null },
      await ingestOpts(),
    );
    for (const p of places) if (p.googlePlaceId) lastResolve?.byId.set(p.googlePlaceId, p);
    return places.map(toCandidate).filter((c): c is PlaceCandidate => c !== null);
  },

  async saveToStash({ denId, placeId, sourceUrl }) {
    const place = lastResolve?.byId.get(placeId);
    if (!place) throw new Error('place_missing_id');
    await ruckus.stash.save({ denId, places: [place], sourceUrl });
    if (lastResolve) {
      const offered = lastResolve.result.candidates;
      const chosen = offered.findIndex(p => p.googlePlaceId === placeId);
      ruckus.confirmations.log({
        mode: lastResolve.result.confirmMode, offered,
        chosen: chosen >= 0 ? [chosen] : [], engine: lastResolve.result.engine,
      }).catch(() => {});   // a lost training row must never fail a save
    }
    const saved = (await ruckusApi.getStash(denId)).find(s => s.placeId === placeId);
    if (!saved) throw new Error('place_not_in_stash');
    return saved;
  },

  async setWant(denId, placeId, want) {
    await ruckus.stash.setWant(denId, placeId, want);
  },

  notifications: {
    registerPushToken: (token, platform) => ruckus.notifications.registerPushToken(token, platform),
    unregisterPushToken: token => ruckus.notifications.unregisterPushToken(token),
  },

  // One take per person per place: add and update are the same write. Both
  // reach the other phones through onStashChange, like saves and votes.
  async addTake(denId, placeId, text) { await ruckus.takes.set(denId, placeId, text); },
  async updateTake(denId, placeId, text) { await ruckus.takes.set(denId, placeId, text); },
  async deleteTake(denId, placeId) { await ruckus.takes.remove(denId, placeId); },
};
