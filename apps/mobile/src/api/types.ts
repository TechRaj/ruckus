/**
 * The backend interface the screens use. `mock.ts` and `ruckus.ts` implement
 * it and `client.ts` picks one. Screens import `api` from `client.ts` only.
 */
import { Critter, Den, PlaceCandidate, StashItem } from '../types';

export type ConfirmMode = 'single' | 'choose' | 'multi' | 'search';

export interface ResolveResult {
  candidates: PlaceCandidate[];
  mode: ConfirmMode;
}

export interface Api {
  auth: {
    /** Emails a 6-digit code. */
    sendCode(email: string, displayName?: string): Promise<void>;
    /** Returns the signed-in user id. */
    verifyCode(email: string, code: string): Promise<string>;
    userId(): Promise<string | null>;
    signOut(): Promise<void>;
  };

  profile: {
    update(patch: { displayName?: string; critter?: Critter }): Promise<void>;
  };

  /** Every Den the user is in, newest first, with members. */
  myDens(): Promise<Den[]>;
  createDen(name: string, emblem: string): Promise<Den>;
  joinDen(code: string): Promise<Den>;
  /**
   * The Den's six-character join code. The ruckus.app domain is not registered,
   * so `url` cannot open the app yet. Share the code.
   */
  getInviteLink(denId: string): Promise<{ code: string; url: string }>;

  getStash(denId: string, pos?: { lat: number; lng: number }): Promise<StashItem[]>;
  /** Calls `cb` when the Den's Stash changes on the server. Returns an unsubscribe function. */
  onStashChange(denId: string, cb: () => void): () => void;

  /** Resolves a shared reel URL to ranked candidates. Runs on device and calls the proxy. */
  resolveSharedUrl(url: string): Promise<ResolveResult>;
  /** Set `fromLink` when searching inside a link's confirm flow. The search is then biased to that link's city. */
  searchPlaces(query: string, opts?: { fromLink?: boolean }): Promise<PlaceCandidate[]>;
  /** Saves a place by id, with the reel URL if there is one. See CLAUDE.md §5.6. */
  saveToStash(args: { denId: string; placeId: string; sourceUrl: string | null }): Promise<StashItem>;
  setWant(denId: string, placeId: string, want: boolean): Promise<void>;

  notifications: {
    /** Registers this device for event reminders under the signed-in user. */
    registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void>;
    /** Removes one device. Call before sign-out, while the session still exists. */
    unregisterPushToken(token: string): Promise<void>;
  };

  /** Comments, one per person per place, stored in the `takes` table. Add and update are the same write. */
  addTake(denId: string, placeId: string, text: string): Promise<void>;
  updateTake(denId: string, placeId: string, text: string): Promise<void>;
  deleteTake(denId: string, placeId: string): Promise<void>;
}
