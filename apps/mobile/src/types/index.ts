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

/** A candidate at or above this confidence is shown alone on the confirm screen. */
export const CONFIDENT = 0.75;

/** A ranked guess from the pipeline, shown on the confirm screen. */
export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  /** From 0 to 1. Decides which confirm variant renders. */
  confidence: number;
  /** Why the pipeline picked it. Shown under the name. */
  reason?: string;
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
}

export interface Den {
  id: string;
  name: string;
  emblem: string;
  members: Member[];
}

/** Minimum `wantCount` for a place to appear under Today, show the Caper dot and appear on Home. */
export const PLAN_THRESHOLD = 3;
export const isNearlyAPlan = (item: StashItem) => item.wantCount >= PLAN_THRESHOLD;

/**
 * The people filter on the Stash (CLAUDE.md §4): everyone, today, or one
 * member. The category filter is separate and applies together with it.
 */
export type Filter = { kind: 'everyone' } | { kind: 'today' } | { kind: 'person'; userId: string };
export type Sort = 'nearby' | 'date';
