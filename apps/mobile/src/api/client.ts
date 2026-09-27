/**
 * The single seam between the UI and the backend.
 *
 * Every screen calls these functions and nothing else. To go live, set
 * USE_MOCKS to false and fill in BASE_URL — no screen changes, no imports
 * to chase. Keep the signatures stable and the backend can move freely.
 *
 * Ownership split (§9): this file is the contract. Amelia owns the callers,
 * her friend owns what answers.
 */
import { Den, PlaceCandidate, StashItem } from '../types';
import { MOCK_USER_ID, mockCandidates, mockDen, mockSearch, mockStash } from './mockData';

const USE_MOCKS = true;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ruckus.app';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const api = {
  async getDen(denId: string): Promise<Den> {
    if (USE_MOCKS) { await delay(200); return mockDen; }
    return request(`/dens/${denId}`);
  },

  async getStash(denId: string): Promise<StashItem[]> {
    if (USE_MOCKS) { await delay(320); return mockStash; }
    return request(`/dens/${denId}/stash`);
  },

  /**
   * Runs on device (§5.6) — this is a local call into the native ingest
   * module, not a network request. Stubbed here so the confirm screen can
   * be built before the Swift side exists.
   */
  async resolveSharedUrl(url: string): Promise<PlaceCandidate[]> {
    if (USE_MOCKS) { await delay(900); return mockCandidates; }
    return request('/resolve', { method: 'POST', body: JSON.stringify({ url }) });
  },

  /** The only write that leaves the device on save. A place id, nothing else. */
  async saveToStash(args: {
    denId: string; placeId: string; sourceUrl: string | null;
  }): Promise<StashItem> {
    if (USE_MOCKS) {
      await delay(400);
      const all = [...mockCandidates, ...mockSearch];
      const c = all.find(x => x.placeId === args.placeId) ?? mockCandidates[0];
      return {
        id: `s_${Date.now()}`, denId: args.denId, savedBy: MOCK_USER_ID,
        placeId: c.placeId, name: c.name, neighbourhood: 'King West',
        category: c.category, lat: c.lat, lng: c.lng,
        sourceUrl: args.sourceUrl, savedAt: new Date().toISOString(),
        interested: [MOCK_USER_ID],
        note: 'Saved just now', distance: '1.8 km', address: c.address,
        takes: [],
      };
    }
    return request(`/dens/${args.denId}/stash`, {
      method: 'POST', body: JSON.stringify(args),
    });
  },

  /** A vibe check — one line from the current user, appended to the item. */
  async addTake(stashId: string, text: string): Promise<StashItem> {
    if (USE_MOCKS) {
      await delay(180);
      const item = mockStash.find(s => s.id === stashId)!;
      item.takes = [...item.takes, { userId: MOCK_USER_ID, text, at: new Date().toISOString() }];
      return { ...item };
    }
    return request(`/stash/${stashId}/takes`, { method: 'POST', body: JSON.stringify({ text }) });
  },

  /** Edit the current user's own comment. One per person per place. */
  async updateTake(stashId: string, text: string): Promise<StashItem> {
    if (USE_MOCKS) {
      await delay(180);
      const item = mockStash.find(s => s.id === stashId)!;
      item.takes = item.takes.map(t => (t.userId === MOCK_USER_ID ? { ...t, text } : t));
      return { ...item };
    }
    return request(`/stash/${stashId}/takes/me`, { method: 'PUT', body: JSON.stringify({ text }) });
  },

  async deleteTake(stashId: string): Promise<StashItem> {
    if (USE_MOCKS) {
      await delay(180);
      const item = mockStash.find(s => s.id === stashId)!;
      item.takes = item.takes.filter(t => t.userId !== MOCK_USER_ID);
      return { ...item };
    }
    return request(`/stash/${stashId}/takes/me`, { method: 'DELETE' });
  },

  async toggleInterest(stashId: string): Promise<StashItem> {
    if (USE_MOCKS) {
      await delay(180);
      const item = mockStash.find(s => s.id === stashId)!;
      const has = item.interested.includes(MOCK_USER_ID);
      item.interested = has
        ? item.interested.filter(u => u !== MOCK_USER_ID)
        : [...item.interested, MOCK_USER_ID];
      return { ...item };
    }
    return request(`/stash/${stashId}/interest`, { method: 'POST' });
  },

  /** Manual entry — §9 keeps this path load-bearing for App Store review. */
  async searchPlaces(query: string): Promise<PlaceCandidate[]> {
    if (USE_MOCKS) {
      await delay(220);
      const q = query.trim().toLowerCase();
      return q ? mockSearch.filter(p => p.name.toLowerCase().includes(q)) : mockSearch;
    }
    return request(`/places/search?q=${encodeURIComponent(query)}`);
  },

  async createDen(name: string): Promise<Den> {
    if (USE_MOCKS) { await delay(300); return { ...mockDen, name }; }
    return request('/dens', { method: 'POST', body: JSON.stringify({ name }) });
  },

  async getInviteLink(denId: string): Promise<{ url: string }> {
    if (USE_MOCKS) { await delay(200); return { url: 'https://ruckus.app/j/8FK2QD' }; }
    return request(`/dens/${denId}/invite`, { method: 'POST' });
  },
};
