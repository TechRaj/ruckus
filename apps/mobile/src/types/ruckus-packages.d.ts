/**
 * Types for @ruckus/api and @ruckus/ingest, which are plain JavaScript with
 * JSDoc. Only what the adapter uses is typed. Add to it as needed.
 */

declare module '@ruckus/api' {
  export type RuckusErrorCode =
    | 'not_signed_in' | 'not_a_member' | 'den_limit_reached' | 'place_limit_reached' | 'den_full'
    | 'invite_invalid' | 'invite_expired' | 'invite_used_up'
    | 'place_missing_id' | 'place_not_in_stash' | 'no_places' | 'too_many_places'
    | 'bad_push_token' | 'bad_platform'
    | 'unexpected';

  export class RuckusError extends Error {
    code: RuckusErrorCode;
    /** True when the app should respond by showing the Ruckus Pro paywall. */
    needsUpgrade: boolean;
    cause?: unknown;
  }

  export interface DenRow {
    id: string;
    name: string;
    crest: string | null;
    created_at?: string;
    role?: string;
    joinedAt?: string;
    memberCount?: number;
  }

  export interface MemberRow {
    id: string;
    display_name: string;
    /** A critter name. This is a key, and it is never a URL. */
    avatar: string | null;
    role?: string;
    joinedAt?: string;
  }

  export interface StashRow {
    placeId: string;
    googlePlaceId: string | null;
    name: string;
    address: string | null;
    neighbourhood: string | null;
    city: string | null;
    kind: 'venue' | 'region' | 'event' | 'trail' | 'accommodation';
    category: string | null;
    coordinate: { lat: number; lng: number } | null;
    distanceM: number | null;
    firstSavedAt: string;
    savers: { id: string; displayName: string; avatar: string | null }[];
    note: string | null;
    sourceUrls: string[];
    when: { text: string | null; start: string | null; end: string | null; recurring: string | null } | null;
    wantCount: number;
    iWant: boolean;
    wanters: { id: string; displayName: string; avatar: string | null }[];
    /** One take per person, oldest first. */
    takes: { userId: string; text: string; at: string }[];
  }

  export interface Ruckus {
    supabase: {
      auth: { getSession(): Promise<{ data: { session: { access_token: string } | null } }> };
    };
    auth: {
      sendCode(email: string, opts?: { displayName?: string }): Promise<void>;
      verifyCode(email: string, token: string): Promise<string>;
      signOut(): Promise<void>;
      userId(): Promise<string | null>;
      onChange(cb: (userId: string | null) => void): () => void;
    };
    profile: {
      me(): Promise<{ id: string; display_name: string; avatar: string | null; is_pro: boolean }>;
      update(patch: { displayName?: string; avatar?: string }): Promise<unknown>;
    };
    dens: {
      create(name: string, crest?: string | null): Promise<DenRow>;
      invite(denId: string): Promise<string>;
      join(code: string): Promise<DenRow>;
      leave(denId: string): Promise<void>;
      mine(): Promise<DenRow[]>;
      members(denId: string): Promise<MemberRow[]>;
      /** `placeLimit` is null when the Den's owner has Pro. */
      allowance(): Promise<{ dens: number; denLimit: number | null }>;
      capacity(denId: string): Promise<{ places: number; placeLimit: number | null; iOwnIt: boolean }>;
    };
    stash: {
      list(denId: string, pos?: { lat?: number; lng?: number }): Promise<StashRow[]>;
      save(args: {
        denId: string; places: unknown[]; note?: string | null;
        engine?: string | null; sourceUrl?: string | null; sourceKind?: string;
      }): Promise<unknown>;
      setWant(denId: string, placeId: string, want: boolean): Promise<number>;
      remove(saveId: string): Promise<void>;
      onChange(denId: string, cb: () => void): () => void;
    };
    /** One take per person per place per Den. Calling `set` again replaces it. */
    takes: {
      set(denId: string, placeId: string, text: string): Promise<unknown>;
      remove(denId: string, placeId: string): Promise<void>;
    };
    capers: {
      list(denId: string): Promise<{ id: string; denId: string; placeId: string; date: string; time: string | null; createdBy: string; going: string[] }[]>;
      make(args: { denId: string; placeId: string; date: string; time?: string | null; going?: string[] }): Promise<{ id: string; denId: string; placeId: string; date: string; time: string | null; createdBy: string; going: string[] } | undefined>;
    };
    confirmations: {
      log(args: { mode: string; offered: unknown[]; chosen?: number[]; engine?: string | null }): Promise<unknown>;
    };
    notifications: {
      registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void>;
      unregisterPushToken(token: string): Promise<void>;
    };
  }

  export function createRuckus(cfg: { url: string; anonKey: string; storage?: unknown }): Ruckus;
}

declare module '@ruckus/ingest' {
  /** The pipeline's output (CLAUDE.md §9). `stash.save` takes these objects back unchanged. */
  export interface ResolvedPlace {
    googlePlaceId: string | null;
    name: string;
    coordinate: { lat: number; lng: number } | null;
    address: string | null;
    neighbourhood: string | null;
    city: string | null;
    kind: 'venue' | 'region' | 'event' | 'trail' | 'accommodation';
    category?: string | null;
    when: { text: string | null; start: string | null; end: string | null; recurring: string | null } | null;
    sourceUrl: string;
    score: number;
    tier: 'high' | 'medium' | 'low';
    reasons: string[];
    explanation: { text: string; tone: 'good' | 'warn' };
  }

  export type ConfirmMode = 'single' | 'choose' | 'multi' | 'search';

  export interface IngestOptions {
    signal?: AbortSignal;
    accessToken?: string;
    userCity?: string;
    endpoint?: string;
    geocodeEndpoint?: string;
    geocode?: boolean;
    concurrency?: number;
  }

  export interface ExtractResult {
    shortcode: string;
    sourceUrl: string;
    city: string | null;
    candidates: ResolvedPlace[];
    top: ResolvedPlace | null;
    confirmMode: ConfirmMode;
    confirmOptions: ResolvedPlace[];
    engine: 'model' | 'heuristic';
  }

  export function extractFromReel(url: string, opts?: IngestOptions): Promise<ExtractResult>;
  export function geocodeCandidates(
    candidates: { name: string; kind?: string; score?: number; reasons?: string[]; geocodeQuery?: string }[],
    ctx?: { city?: string | null; sourceUrl?: string },
    opts?: IngestOptions,
  ): Promise<ResolvedPlace[]>;
  /** Returns every match for a typed query. */
  export function searchPlaces(
    query: string,
    ctx?: { city?: string | null },
    opts?: IngestOptions,
  ): Promise<ResolvedPlace[]>;
}
