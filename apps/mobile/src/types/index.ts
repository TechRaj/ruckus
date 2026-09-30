import type { EventWhen } from '../lib/time';

/**
 * The app's data types. They are shared with the backend, so change them on
 * both sides together.
 */

/** Every category the backend returns is mapped to one of these three. */
export type Category = 'eat' | 'drink' | 'do';
export const CATEGORIES: Category[] = ['eat', 'drink', 'do'];
export const CATEGORY_LABEL: Record<Category, string> = { eat: 'Food', drink: 'Drinks', do: 'Outdoors' };

/** One member's comment on a place. Returned embedded on the StashItem. */
export interface Take {
  userId: string;
  text: string;
  at: string;
}

/** Avatar animals. Only the first four have images in `theme/critters.ts`. */
export type Critter =
  | 'raccoon' | 'possum' | 'squirrel' | 'skunk'
  | 'chipmunk' | 'pigeon' | 'fox' | 'crow';

/** A ranked guess from the pipeline, shown on the confirm screen. */
export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  /** Why the pipeline picked it. Shown under the name. */
  reason?: string;
  /** The date as the caption wrote it, such as "October 3 to 4". Set for events. */
  when?: string | null;
  /** How sure the pipeline is. When a link names several places, the low ones start unticked. */
  tier?: 'high' | 'medium' | 'low';
}

/**
 * A place in a Den's Stash. There is one row per place regardless of how many
 * people saved it. `id` is the place id, which the backend dedupes on.
 */
export interface StashItem {
  id: string;
  denId: string;
  /** The user who saved it first. */
  savedBy: string;
  /** Everyone in the Den who saved it. Only they can take it out of the Stash. */
  savers?: string[];
  placeId: string;
  name: string;
  neighbourhood: string;
  category: Category;
  lat: number;
  lng: number;
  /** The original reel or link. Open it as a deep link and never embed it (CLAUDE.md §5.6). */
  sourceUrl: string | null;
  savedAt: string;
  /** How many Den members want to go, and whether the current user is one of them. */
  wantCount: number;
  iWant: boolean;
  /** User ids of members who want to go. May be incomplete, so use `wantCount` for counts. */
  interested: string[];
  /** The saver's one-line note about the place. */
  note: string;
  /** Other members' comments. The saver's `note` is shown before them. */
  takes: Take[];
  /** Straight-line distance from the user, already formatted for display. */
  distance: string;
  /** Metres from the user, for the Nearby sort. null without a location. */
  distanceM?: number | null;
  /** When it happens, if the reel was an event (CLAUDE.md §9). */
  when?: EventWhen | null;
  address?: string;
}

/** A planned outing: one saved place on one day, with the people going. */
export interface Caper {
  id: string;
  denId: string;
  placeId: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Free text such as "7 pm", or null when no time was picked. */
  time: string | null;
  createdBy: string;
  going: string[];
}

export interface Member {
  userId: string;
  displayName: string;
  critter: Critter;
  /** The owner's Ruckus Pro is what lifts the Den's place limit. */
  role?: 'owner' | 'member';
}

/** How full a Den is. `placeLimit` is null once the owner has Ruckus Pro. */
export interface DenCapacity {
  places: number;
  placeLimit: number | null;
  /** Only the owner can lift the limit, so only they are offered the paywall. */
  iOwnIt: boolean;
}

/** How many Dens I'm in. `denLimit` is null for Ruckus Pro. */
export interface DenAllowance {
  dens: number;
  denLimit: number | null;
}

export interface Den {
  id: string;
  name: string;
  emblem: string;
  members: Member[];
}

/** Minimum `wantCount` for a place to appear under Today, show the Caper dot and appear on Home. */
export const PLAN_THRESHOLD = 3;

/** Show the Den's room meter once this share of its free places is used. */
export const ROOM_WARNING = 0.8;
export const isNearlyAPlan = (item: StashItem) => item.wantCount >= PLAN_THRESHOLD;

/**
 * The people filter on the Stash (CLAUDE.md §4): everyone, today, or one
 * member. The category filter is separate and applies together with it.
 */
export type Filter = { kind: 'everyone' } | { kind: 'today' } | { kind: 'person'; userId: string };
export type Sort = 'nearby' | 'date';
