/**
 * Shared session, selection, filter, and overlay state — the deep module.
 *
 * Screens read derived views from here (visible, nearlyPlans, savedCountBy)
 * and call verbs; they never derive or fetch themselves. §4 calls two-way
 * pin/row sync "the real engineering cost of the pattern" — the fix is that
 * neither the map nor the list owns selection; both observe this.
 *
 * Session is a small state machine: signed out → no Den yet → ready. The
 * navigator shows sign-in, onboarding, or the tabs accordingly.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { api } from '../api/client';
import { identify, onProChange, showCustomerCenter, showPaywall } from '../billing/purchases';
import { unregisterCurrentPushToken, useEventReminders } from '../notifications/push';
import { Category, Den, Filter, Member, Sort, StashItem, isNearlyAPlan } from '../types';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'confirm'; url: string | null }
  | { kind: 'detail'; id: string }
  | { kind: 'missing-event' }
  | { kind: 'saved'; name: string };

export type Session = 'loading' | 'signedOut' | 'noDen' | 'ready';

interface StashState {
  session: Session;
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
  currentUserId: string | null;
  /** The list after both filter axes, the query, and the sort. */
  visible: StashItem[];
  /** Places with three or more people in — Today's list, Home's card. */
  nearlyPlans: StashItem[];
  memberById: Map<string, Member>;
  /** How many places each member has stashed. */
  savedCountBy: Map<string, number>;
  overlay: Overlay;
  /** The RevenueCat entitlement — instant, and what the app shows. The Den limit is the server's. */
  isPro: boolean;
  /** The paywall, or the Customer Center for someone who's already Pro. */
  openPro: () => Promise<void>;
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
  /** A reminder tap. Opens the event, or says it is gone. */
  openReminder: (denId: string, placeId: string) => Promise<void>;
  /** After sign-in, onboarding, or a join: re-read who I am and which Den. */
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<StashState | null>(null);

export function StashProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>('loading');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
  const [isPro, setIsPro] = useState(false);

  const loadStash = useCallback(async (denId: string) => {
    setLoading(true);
    setError(null);
    try {
      setStash(await api.getStash(denId));
    } catch {
      setError("Couldn't load your Stash.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const me = await api.auth.userId();
      setCurrentUserId(me);
      /** Not awaited: billing being slow or down never holds up the session. */
      identify(me).then(setIsPro);
      if (!me) { setSession('signedOut'); setDen(null); setStash([]); return; }
      const dens = await api.myDens();
      if (dens.length === 0) { setSession('noDen'); setDen(null); setStash([]); return; }
      setDen(dens[0]);
      setSession('ready');
      await loadStash(dens[0].id);
    } catch {
      setSession('signedOut');
    }
  }, [loadStash]);

  useEffect(() => { refreshSession(); }, [refreshSession]);
  useEffect(() => onProChange(setIsPro), []);

  const openPro = useCallback(async () => {
    if (isPro) return showCustomerCenter();
    if (await showPaywall()) setIsPro(true);
  }, [isPro]);

  /** A friend's save or vote arrives without a pull-to-refresh. */
  useEffect(() => {
    if (!den) return;
    return api.onStashChange(den.id, () => { loadStash(den.id); });
  }, [den, loadStash]);

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

  const setFilter = useCallback((f: Filter) => { setFilterState(f); setSelectedId(null); }, []);
  const setCategory = useCallback((c: Category | null) => { setCategoryState(c); setSelectedId(null); }, []);

  /** Optimistic: the change shows at once and the Stash reloads only on failure. */
  const patch = useCallback((id: string, fn: (s: StashItem) => StashItem) => {
    setStash(prev => prev.map(s => (s.id === id ? fn(s) : s)));
  }, []);
  const orReload = useCallback(async (p: Promise<unknown>) => {
    try { await p; } catch { if (den) loadStash(den.id); }
  }, [den, loadStash]);

  const toggleInterest = useCallback((id: string) => {
    const item = stash.find(s => s.id === id);
    if (!item || !den || !currentUserId) return;
    const want = !item.iWant;
    patch(id, s => ({
      ...s, iWant: want, wantCount: Math.max(0, s.wantCount + (want ? 1 : -1)),
      interested: want ? [...new Set([...s.interested, currentUserId])] : s.interested.filter(u => u !== currentUserId),
    }));
    orReload(api.setWant(den.id, item.placeId, want));
  }, [stash, den, currentUserId, patch, orReload]);

  const addTake = useCallback((id: string, text: string) => {
    if (!den || !currentUserId) return;
    const take = { userId: currentUserId, text, at: new Date().toISOString() };
    patch(id, s => ({ ...s, takes: [...s.takes, take] }));
    orReload(api.addTake(den.id, id, text));
  }, [den, currentUserId, patch, orReload]);

  const updateTake = useCallback((id: string, text: string) => {
    if (!den || !currentUserId) return;
    patch(id, s => ({ ...s, takes: s.takes.map(t => (t.userId === currentUserId ? { ...t, text } : t)) }));
    orReload(api.updateTake(den.id, id, text));
  }, [den, currentUserId, patch, orReload]);

  const deleteTake = useCallback((id: string) => {
    if (!den || !currentUserId) return;
    patch(id, s => ({ ...s, takes: s.takes.filter(t => t.userId !== currentUserId) }));
    orReload(api.deleteTake(den.id, id));
  }, [den, currentUserId, patch, orReload]);

  const openReminder = useCallback(async (denId: string, placeId: string) => {
    try {
      const dens = await api.myDens();
      const target = dens.find(d => d.id === denId);
      if (!target) {
        setOverlay({ kind: 'missing-event' });
        return;
      }
      setDen(target);
      setSession('ready');
      const items = await api.getStash(denId);
      setStash(items);
      if (!items.some(s => s.id === placeId)) {
        setOverlay({ kind: 'missing-event' });
        return;
      }
      setSelectedId(placeId);
      setOverlay({ kind: 'detail', id: placeId });
    } catch {
      setOverlay({ kind: 'missing-event' });
    }
  }, []);

  const addToStash = useCallback(async (placeId: string, sourceUrl: string | null) => {
    if (!den) throw new Error('not_a_member');
    const saved = await api.saveToStash({ denId: den.id, placeId, sourceUrl });
    setStash(prev => (prev.some(s => s.placeId === saved.placeId) ? prev : [saved, ...prev]));
    return saved;
  }, [den]);

  const signOut = useCallback(async () => {
    await unregisterCurrentPushToken();
    await api.auth.signOut();
    setOverlay({ kind: 'none' });
    await refreshSession();
  }, [refreshSession]);

  useEventReminders(session === 'ready', useCallback(target => {
    openReminder(target.denId, target.placeId);
  }, [openReminder]));

  const value: StashState = {
    session, loading, error, den, stash, filter, category, query, sort, selectedId,
    currentUserId,
    visible, nearlyPlans, memberById, savedCountBy, overlay,
    isPro, openPro,
    setFilter, setCategory, setQuery, setSort,
    select: setSelectedId,
    toggleInterest,
    addTake, updateTake, deleteTake,
    addToStash,
    openOverlay: setOverlay,
    openReminder,
    refreshSession,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStash() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStash must be used inside StashProvider');
  return v;
}
