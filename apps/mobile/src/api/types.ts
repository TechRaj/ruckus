/**
 * The interface every screen builds against — the one seam to the backend.
 *
 * Two adapters satisfy it: `mock.ts` (in-memory, runs in Expo Go with no
 * keys) and `ruckus.ts` (@ruckus/api over Supabase + @ruckus/ingest via the
 * proxy). `client.ts` picks one. Screens import `api` from client and never
 * name Supabase, a table, or a URL.
 */
import { Critter, Den, PlaceCandidate, StashItem } from '../types';

export type ConfirmMode = 'single' | 'choose' | 'multi' | 'search';

export interface ResolveResult {
  candidates: PlaceCandidate[];
  mode: ConfirmMode;
}

export interface Api {
  auth: {
    /** Email a 6-digit code. */
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
  getInviteLink(denId: string): Promise<{ url: string }>;

  getStash(denId: string, pos?: { lat: number; lng: number }): Promise<StashItem[]>;
  /** A friend saved or voted; re-fetch. Returns unsubscribe. */
  onStashChange(denId: string, cb: () => void): () => void;

  /** A shared reel → ranked candidates. Runs on device against the proxy. */
  resolveSharedUrl(url: string): Promise<ResolveResult>;
  searchPlaces(query: string): Promise<PlaceCandidate[]>;
  /** The one write on save: a place id, nothing else leaves the device (§5.6). */
  saveToStash(args: { denId: string; placeId: string; sourceUrl: string | null }): Promise<StashItem>;
  setWant(denId: string, placeId: string, want: boolean): Promise<void>;

  notifications: {
    /** Register this device for event reminders. The token is the signed-in user's. */
    registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void>;
    /** Forget one device. Call before sign-out, while the session still exists. */
    unregisterPushToken(token: string): Promise<void>;
  };

  /** Comments: one per person per place. Stored in the `takes` table; add and update are the same write. */
  addTake(denId: string, placeId: string, text: string): Promise<void>;
  updateTake(denId: string, placeId: string, text: string): Promise<void>;
  deleteTake(denId: string, placeId: string): Promise<void>;
}
