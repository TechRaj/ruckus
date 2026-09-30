/**
 * The backend interface the screens use. `mock.ts` and `ruckus.ts` implement
 * it and `client.ts` picks one. Screens import `api` from `client.ts` only.
 */
import { Caper, Critter, Den, DenAllowance, DenCapacity, PlaceCandidate, StashItem } from '../types';

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
  /** How full a Den is, for "6 of 25 places". */
  getCapacity(denId: string): Promise<DenCapacity>;
  /** How many Dens I'm in, for "2 of 3". The limit comes from the server. */
  getDenAllowance(): Promise<DenAllowance>;
  createDen(name: string, emblem: string): Promise<Den>;
  joinDen(code: string): Promise<Den>;
  /** The Den's six-character join code. There's no invite link: nobody owns a domain for one. */
  getInviteLink(denId: string): Promise<{ code: string }>;

  getStash(denId: string, pos?: { lat: number; lng: number }): Promise<StashItem[]>;
  /** Calls `cb` when the Den's Stash changes on the server. Returns an unsubscribe function. */
  onStashChange(denId: string, cb: () => void): () => void;

  /** Resolves a shared reel URL to ranked candidates. Runs on device and calls the proxy. */
  resolveSharedUrl(url: string): Promise<ResolveResult>;
  /** Set `fromLink` when searching inside a link's confirm flow. The search is then biased to that link's city. */
  searchPlaces(query: string, opts?: { fromLink?: boolean }): Promise<PlaceCandidate[]>;
  /**
   * Saves one or more places by id in one write, with the reel URL if there is
   * one. Up to 20. Returns the saved rows in the order asked. See CLAUDE.md §5.6.
   */
  saveToStash(args: { denId: string; placeIds: string[]; sourceUrl: string | null }): Promise<StashItem[]>;
  /**
   * Take my save of a place out of the Stash. A friend's save of it stays. Resolves
   * to how many people still have it; 0 means it's gone, with its comments and plans.
   */
  removeFromStash(denId: string, placeId: string): Promise<number>;
  setWant(denId: string, placeId: string, want: boolean): Promise<void>;

  /** Every Caper in the Den, past ones included. */
  getCapers(denId: string): Promise<Caper[]>;
  /** The caller must want to go to the place. Other devices hear of it through onStashChange. */
  createCaper(args: { denId: string; placeId: string; date: string; time: string | null; going: string[] }): Promise<Caper>;

  /**
   * Ask the server to re-read my Pro status from RevenueCat, now. Right after a
   * purchase the webhook can take a few seconds; this closes that gap. Resolves
   * to whether the server now has me as Pro.
   */
  syncPro(): Promise<boolean>;
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
