/**
 * The four shapes — context §9.
 * Agreed with the backend before either track opened an editor.
 * Do not change these without changing them on both sides.
 */

/** Three values for launch. Everything Places returns maps into one. */
export type Category = 'eat' | 'drink' | 'do';
export const CATEGORIES: Category[] = ['eat', 'drink', 'do'];
export const CATEGORY_LABEL: Record<Category, string> = { eat: 'Food', drink: 'Drinks', do: 'Outdoors' };

/**
 * A vibe check — one friend's line about a place, added after "I'm in".
 * Embedded on the item: one read, one shape, mirrors `interested`.
 */
export interface Take {
  userId: string;
  text: string;
  at: string;
}

/** Urban scavengers — §13.6. The first four ship; the rest are a render away. */
export type Critter =
  | 'raccoon' | 'possum' | 'squirrel' | 'skunk'
  | 'chipmunk' | 'pigeon' | 'fox' | 'crow';

/** A candidate at or above this confidence is shown alone on confirm — §5.7. */
export const CONFIDENT = 0.75;

/** A ranked guess from the pipeline, shown on the confirm screen. */
export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  /** 0–1. Drives which confirm variant renders — see §5.7. */
  confidence: number;
  /** Why the ranker picked it, shown under the name so the tap is informed. */
  reason?: string;
}

/**
 * A place in a Den's Stash — one row per place, however many people saved it.
 * `id` is the place id; the backend dedupes across reels on it.
 */
export interface StashItem {
  id: string;
  denId: string;
  /** Whoever saved it first. */
  savedBy: string;
  placeId: string;
  name: string;
  neighbourhood: string;
  category: Category;
  lat: number;
  lng: number;
  /** The original reel or link. Deep-linked out, never embedded (§5.6). */
  sourceUrl: string | null;
  savedAt: string;
  /** How many people in the Den want to go, and whether I'm one of them. */
  wantCount: number;
  iWant: boolean;
  /** Who wants to go, when the backend tells us. Faces are drawn from this; counts never depend on it. */
  interested: string[];
  /** One human line about why it is saved — §13.6. The point of the app. */
  note: string;
  /** Everyone else's one line. The saver's `note` is the first card in the stack. */
  takes: Take[];
  /** Straight-line distance from the user, pre-formatted by the server. */
  distance: string;
  address?: string;
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

/** Three or more people want to go: nearly a plan. Drives Today, the Caper dot, and Home. */
export const PLAN_THRESHOLD = 3;
export const isNearlyAPlan = (item: StashItem) => item.wantCount >= PLAN_THRESHOLD;

/**
 * The two filter axes on the Stash — §4. People first: Everyone / Today /
 * one per member. Category composes with it ("Mia's drinks").
 */
export type Filter = { kind: 'everyone' } | { kind: 'today' } | { kind: 'person'; userId: string };
export type Sort = 'nearby' | 'date';
