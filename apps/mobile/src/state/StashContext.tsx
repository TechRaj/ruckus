/**
 * Shared selection, filter, and overlay state.
 *
 * §4 calls two-way pin/row sync "the real engineering cost of the pattern and
 * the thing that feels broken if half-built." The fix is that neither the map
 * nor the list owns selection — both observe this.
 *
 * The overlay lives here too, because the save loop can be opened from three
 * places (the sheet header, Home, and eventually the share extension) and none
 * of them should own it.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { api } from '../api/client';
import { MOCK_USER_ID } from '../api/mockData';
import { Category, Den, Filter, Member, Sort, StashItem, isNearlyAPlan } from '../types';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'confirm'; url: string | null }
  | { kind: 'detail'; id: string }
  | { kind: 'saved'; name: string };

interface StashState {
  loading: boolean;
  error: string | null;
  den: Den | null;
  stash: StashItem[];
  filter: Filter;
  /** The second filter axis. Composes with `filter`: "Mia's drinks". */
  category: Category | null;
  /** Search across name, neighbourhood and note. Composes with both. */
  query: string;
  sort: Sort;
  selectedId: string | null;
  currentUserId: string;
  /** The list after both filter axes, the query, and the sort. */
  visible: StashItem[];
  /** Places with three or more people in — Today's list, Home's card. */
  nearlyPlans: StashItem[];
  memberById: Map<string, Member>;
  /** How many places each member has stashed. */
  savedCountBy: Map<string, number>;
  overlay: Overlay;
  setFilter: (f: Filter) => void;
  setCategory: (c: Category | null) => void;
  setQuery: (q: string) => void;
  setSort: (s: Sort) => void;
  select: (id: string | null) => void;
  toggleInterest: (id: string) => void;
  addTake: (id: string, text: string) => void;
  updateTake: (id: string, text: string) => void;
  deleteTake: (id: string) => void;
  addToStash: (placeId: string, sourceUrl: string | null) => Promise<StashItem>;
  openOverlay: (o: Overlay) => void;
}

const Ctx = createContext<StashState | null>(null);

export function StashProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [den, setDen] = useState<Den | null>(null);
  const [stash, setStash] = useState<StashItem[]>([]);
  const [filter, setFilterState] = useState<Filter>({ kind: 'everyone' });
  const [category, setCategoryState] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('nearby');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getDen('den_1');
      const s = await api.getStash(d.id);
      setDen(d);
      setStash(s);
    } catch {
      setError("Couldn't load your Stash.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const memberById = useMemo(
    () => new Map((den?.members ?? []).map(m => [m.userId, m])),
    [den],
  );
  const savedCountBy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stash) counts.set(s.savedBy, (counts.get(s.savedBy) ?? 0) + 1);
    return counts;
  }, [stash]);
  const nearlyPlans = useMemo(() => stash.filter(isNearlyAPlan), [stash]);

  /**
   * Filtering hides rows but never removes pins — §12.2 collapses other
   * people's pins to dots instead, so the map keeps its shape.
   */
  const visible = useMemo(() => {
    let list = stash;
    if (filter.kind === 'person') list = list.filter(s => s.savedBy === filter.userId);
    if (filter.kind === 'today') list = list.filter(isNearlyAPlan);
    if (category) list = list.filter(s => s.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q)
        || s.neighbourhood.toLowerCase().includes(q)
        || s.note.toLowerCase().includes(q));
    }
    return sort === 'date'
      ? [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      : list;
  }, [stash, filter, category, query, sort]);

  const setFilter = useCallback((f: Filter) => {
    setFilterState(f);
    setSelectedId(null);
  }, []);

  const setCategory = useCallback((c: Category | null) => {
    setCategoryState(c);
    setSelectedId(null);
  }, []);

  const toggleInterest = useCallback(async (id: string) => {
    setStash(prev => prev.map(s => {
      if (s.id !== id) return s;
      const has = s.interested.includes(MOCK_USER_ID);
      return {
        ...s,
        interested: has
          ? s.interested.filter(u => u !== MOCK_USER_ID)
          : [...s.interested, MOCK_USER_ID],
      };
    }));
    try {
      await api.toggleInterest(id);
    } catch {
      load();
    }
  }, [load]);

  /** Optimistic, like toggleInterest: the line appears at once and reloads only on failure. */
  const addTake = useCallback(async (id: string, text: string) => {
    const take = { userId: MOCK_USER_ID, text, at: new Date().toISOString() };
    setStash(prev => prev.map(s => (s.id === id ? { ...s, takes: [...s.takes, take] } : s)));
    try {
      await api.addTake(id, text);
    } catch {
      load();
    }
  }, [load]);

  const updateTake = useCallback(async (id: string, text: string) => {
    setStash(prev => prev.map(s => (s.id === id
      ? { ...s, takes: s.takes.map(t => (t.userId === MOCK_USER_ID ? { ...t, text } : t)) }
      : s)));
    try {
      await api.updateTake(id, text);
    } catch {
      load();
    }
  }, [load]);

  const deleteTake = useCallback(async (id: string) => {
    setStash(prev => prev.map(s => (s.id === id
      ? { ...s, takes: s.takes.filter(t => t.userId !== MOCK_USER_ID) }
      : s)));
    try {
      await api.deleteTake(id);
    } catch {
      load();
    }
  }, [load]);

  const addToStash = useCallback(async (placeId: string, sourceUrl: string | null) => {
    const saved = await api.saveToStash({ denId: den?.id ?? 'den_1', placeId, sourceUrl });
    setStash(prev => (prev.some(s => s.placeId === saved.placeId) ? prev : [saved, ...prev]));
    return saved;
  }, [den]);

  const value: StashState = {
    loading, error, den, stash, filter, category, query, sort, selectedId,
    currentUserId: MOCK_USER_ID,
    visible, nearlyPlans, memberById, savedCountBy, overlay,
    setFilter, setCategory, setQuery, setSort,
    select: setSelectedId,
    toggleInterest,
    addTake, updateTake, deleteTake,
    addToStash,
    openOverlay: setOverlay,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStash() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStash must be used inside StashProvider');
  return v;
}
