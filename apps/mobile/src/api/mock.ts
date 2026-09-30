/**
 * In-memory adapter. Needs no keys. Sign in with any email and any six digits.
 * State is held in this module and resets when the app reloads.
 */
import { Api, ResolveResult } from './types';
import {
  MOCK_USER_ID, mockCandidates, mockDen, mockItinerary, mockPair, mockSearch, mockStash,
} from './mockData';
import { Caper, Den, StashItem } from '../types';
import { parseDay } from '../lib/time';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let userId: string | null = null;
let dens: Den[] = [];
const stash: StashItem[] = mockStash.map(s => ({ ...s, takes: [...s.takes] }));
const capers: Caper[] = [];
const listeners = new Map<string, Set<() => void>>();

const notify = (denId: string) => listeners.get(denId)?.forEach(cb => cb());
const find = (placeId: string) => {
  const item = stash.find(s => s.placeId === placeId);
  if (!item) throw new Error('place_not_in_stash');
  return item;
};

export const mockApi: Api = {
  auth: {
    async sendCode() { await delay(300); },
    async verifyCode(_email, code) {
      await delay(300);
      if (!/^\d{6}$/.test(code.trim())) throw new Error('That code doesn\'t look right.');
      userId = MOCK_USER_ID;
      return userId;
    },
    async userId() { await delay(60); return userId; },
    /** The account keeps its Dens, so signing back in returns to them. */
    async signOut() { userId = null; },
  },

  profile: {
    async update() { await delay(120); },
  },

  async myDens() { await delay(200); return dens; },
  async getCapacity(denId) {
    await delay(120);
    return { places: stash.filter(s => s.denId === denId).length, placeLimit: 25, iOwnIt: true };
  },
  async getDenAllowance() { await delay(120); return { dens: dens.length, denLimit: 3 }; },
  async createDen(name, emblem) {
    await delay(300);
    /** The first Den made is the example one, with its places and members. Later ones start empty. */
    const first = !dens.some(d => d.id === mockDen.id);
    const den: Den = first
      ? { ...mockDen, name, emblem }
      : { id: `den_${dens.length + 1}`, name, emblem, members: mockDen.members.filter(m => m.userId === MOCK_USER_ID) };
    dens = [den, ...dens];
    return den;
  },
  async joinDen(code) {
    await delay(300);
    if (code.trim().length !== 6) throw new Error("That code doesn't match any Den.");
    if (!dens.some(d => d.id === mockDen.id)) dens = [mockDen, ...dens];
    return mockDen;
  },
  async getInviteLink() { await delay(200); return { code: '8FK2QD' }; },

  async removeFromStash(denId, placeId) {
    await delay(200);
    const i = stash.findIndex(s => s.denId === denId && s.placeId === placeId);
    if (i >= 0) stash.splice(i, 1);
    return 0;
  },
  async getStash(denId) { await delay(320); return stash.filter(s => s.denId === denId).map(s => ({ ...s })); },
  onStashChange(denId, cb) {
    if (!listeners.has(denId)) listeners.set(denId, new Set());
    listeners.get(denId)!.add(cb);
    return () => { listeners.get(denId)?.delete(cb); };
  },

  /** The link decides the example: "trip" is an itinerary, "two" is two matches, anything else is one. */
  async resolveSharedUrl(url): Promise<ResolveResult> {
    await delay(900);
    if (/trip/i.test(url)) return { candidates: mockItinerary, mode: 'multi' };
    if (/two/i.test(url)) return { candidates: mockPair, mode: 'choose' };
    return { candidates: mockCandidates, mode: 'single' };
  },
  async searchPlaces(query) {
    await delay(220);
    const q = query.trim().toLowerCase();
    return q ? mockSearch.filter(p => p.name.toLowerCase().includes(q)) : mockSearch;
  },
  async saveToStash({ denId, placeIds, sourceUrl, dates = {} }) {
    await delay(400);
    const known = [...mockCandidates, ...mockPair, ...mockItinerary, ...mockSearch];
    const saved = placeIds.map(placeId => {
      const existing = stash.find(s => s.placeId === placeId && s.denId === denId);
      if (existing) return { ...existing };
      const c = known.find(x => x.placeId === placeId) ?? mockCandidates[0];
      const typed = dates[placeId];
      const when = typed ? { text: typed, start: parseDay(typed), end: null, recurring: null } : c.when;
      const item: StashItem = {
        id: c.placeId, denId, savedBy: MOCK_USER_ID,
        placeId: c.placeId, name: c.name, neighbourhood: 'Toronto',
        category: c.category, lat: c.lat, lng: c.lng,
        sourceUrl, savedAt: new Date().toISOString(),
        interested: [MOCK_USER_ID], wantCount: 1, iWant: true,
        note: when?.text ?? 'Saved just now', headline: c.headline, when, distance: '', address: c.address,
        takes: [],
      };
      stash.unshift(item);
      return { ...item };
    });
    notify(denId);
    return saved;
  },
  async getCapers(denId) { await delay(120); return capers.filter(c => c.denId === denId).map(c => ({ ...c })); },
  async createCaper({ denId, placeId, date, time, going }) {
    await delay(300);
    const caper: Caper = {
      id: `caper_${capers.length + 1}`, denId, placeId, date, time, createdBy: MOCK_USER_ID, going,
    };
    capers.push(caper);
    notify(denId);
    return { ...caper };
  },

  async syncPro() { return false; },
  notifications: {
    async registerPushToken() {},
    async unregisterPushToken() {},
  },

  async setWant(denId, placeId, want) {
    await delay(180);
    const item = find(placeId);
    item.iWant = want;
    item.interested = want
      ? [...new Set([...item.interested, MOCK_USER_ID])]
      : item.interested.filter(u => u !== MOCK_USER_ID);
    item.wantCount = item.interested.length;
    notify(denId);
  },

  // Each write notifies listeners, as the real backend does over realtime.
  async addTake(denId, placeId, text) {
    await delay(180);
    const item = find(placeId);
    item.takes = [
      ...item.takes.filter(t => t.userId !== MOCK_USER_ID),
      { userId: MOCK_USER_ID, text, at: new Date().toISOString() },
    ];
    notify(denId);
  },
  async updateTake(denId, placeId, text) {
    await delay(180);
    const item = find(placeId);
    item.takes = item.takes.map(t => (t.userId === MOCK_USER_ID ? { ...t, text } : t));
    notify(denId);
  },
  async deleteTake(denId, placeId) {
    await delay(180);
    const item = find(placeId);
    item.takes = item.takes.filter(t => t.userId !== MOCK_USER_ID);
    notify(denId);
  },
};
