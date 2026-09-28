/**
 * In-memory adapter. Needs no keys. Sign in with any email and any six digits.
 * State is held in this module and resets when the app reloads.
 */
import { Api, ResolveResult } from './types';
import { MOCK_USER_ID, mockCandidates, mockDen, mockSearch, mockStash } from './mockData';
import { Den, StashItem } from '../types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let userId: string | null = null;
let dens: Den[] = [];
const stash: StashItem[] = mockStash.map(s => ({ ...s, takes: [...s.takes] }));
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
  async createDen(name, emblem) {
    await delay(300);
    const den = { ...mockDen, name, emblem };
    dens = [den, ...dens];
    return den;
  },
  async joinDen(code) {
    await delay(300);
    if (code.trim().length !== 6) throw new Error("That code doesn't match any Den.");
    dens = [mockDen, ...dens];
    return mockDen;
  },
  async getInviteLink() { await delay(200); return { code: '8FK2QD', url: 'https://ruckus.app/j/8FK2QD' }; },

  async getStash() { await delay(320); return stash.map(s => ({ ...s })); },
  onStashChange(denId, cb) {
    if (!listeners.has(denId)) listeners.set(denId, new Set());
    listeners.get(denId)!.add(cb);
    return () => { listeners.get(denId)?.delete(cb); };
  },

  async resolveSharedUrl(): Promise<ResolveResult> {
    await delay(900);
    return { candidates: mockCandidates, mode: 'single' };
  },
  async searchPlaces(query) {
    await delay(220);
    const q = query.trim().toLowerCase();
    return q ? mockSearch.filter(p => p.name.toLowerCase().includes(q)) : mockSearch;
  },
  async saveToStash({ denId, placeId, sourceUrl }) {
    await delay(400);
    const existing = stash.find(s => s.placeId === placeId);
    if (existing) return { ...existing };
    const c = [...mockCandidates, ...mockSearch].find(x => x.placeId === placeId) ?? mockCandidates[0];
    const item: StashItem = {
      id: c.placeId, denId, savedBy: MOCK_USER_ID,
      placeId: c.placeId, name: c.name, neighbourhood: 'King West',
      category: c.category, lat: c.lat, lng: c.lng,
      sourceUrl, savedAt: new Date().toISOString(),
      interested: [MOCK_USER_ID], wantCount: 1, iWant: true,
      note: 'Saved just now', distance: '1.8 km', address: c.address,
      takes: [],
    };
    stash.unshift(item);
    notify(denId);
    return { ...item };
  },
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
