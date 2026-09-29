/**
 * Shared session, selection, filter and overlay state. Screens read the
 * derived lists from here and call its functions. The map and the list both
 * read `selectedId` from here, which keeps pin and row selection in sync
 * (CLAUDE.md §4).
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { api } from '../api/client';
import { markSignedOut } from '../lib/lastSignIn';
import { identify, onProChange, showCustomerCenter, showPaywall } from '../billing/purchases';
import { unregisterCurrentPushToken, useEventReminders } from '../notifications/push';
import { isoDay } from '../lib/time';
import { Caper, Category, Den, Filter, Member, Sort, StashItem, isNearlyAPlan, DenAllowance, DenCapacity } from '../types';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'confirm'; url: string | null }
  | { kind: 'detail'; id: string }
  | { kind: 'missing-event' }
  | { kind: 'sign-out' }
  | { kind: 'caper'; id: string }
  | { kind: 'caper-made'; caperId: string }
  | { kind: 'saved'; name: string };

export type Session = 'loading' | 'signedOut' | 'noDen' | 'ready';

interface StashState {
  session: Session;
  loading: boolean;
  error: string | null;
  den: Den | null;
  stash: StashItem[];
  filter: Filter;
  /** Category filter. Applied together with `filter`. */
  category: Category | null;
  /** Search across name, neighbourhood and note. Applied together with both filters. */
  query: string;
  sort: Sort;
  selectedId: string | null;
  currentUserId: string | null;
  /** The Stash after both filters, the query and the sort. */
  visible: StashItem[];
  /** Places with three or more people interested. Used by the Today filter and the Home card. */
  nearlyPlans: StashItem[];
  /** Capers from today onward, soonest first, each with its place. */
  upcoming: { caper: Caper; place: StashItem }[];
  /** The upcoming Caper for a place, keyed by place id. */
  caperByPlace: Map<string, Caper>;
  /** Only for a place the current user wants to go to. */
  createCaper: (args: { id: string; date: string; time: string | null; going: string[] }) => Promise<Caper>;
  memberById: Map<string, Member>;
  /** How many places each member has stashed. */
  savedCountBy: Map<string, number>;
  overlay: Overlay;
  /** The RevenueCat entitlement. Display only. The server enforces the Den limit. */
  isPro: boolean;
  /** Opens the paywall, or the Customer Center if the user is already Pro. */
  /** Resolves true if they're Pro afterwards and the server knows, so a blocked action can be retried. */
  openPro: () => Promise<boolean>;
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
  /** Handles a reminder tap. Opens the event, or the missing-event overlay if it no longer exists. */
  openReminder: (denId: string, placeId: string) => Promise<void>;
  /** Every Den the user is in. `den` is the active one. */
  /** How full the Den on screen is. null until loaded. */
  capacity: DenCapacity | null;
  /** How many Dens I'm in, out of how many. null until loaded. */
  denAllowance: DenAllowance | null;
  dens: Den[];
  /** Sets the active Den. The choice persists across launches. */
  switchDen: (denId: string) => Promise<void>;
  /**
   * Reloads the user, their Dens and the active Den's Stash. Call after
   * sign-in, onboarding, joining or creating a Den. `preferDenId` sets which
   * Den becomes active.
   */
  refreshSession: (preferDenId?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * The last active Den, stored per device. An id that no longer matches falls
 * back to the newest Den. AsyncStorage is required lazily so the mock path,
 * which has no native modules, never loads it.
 */
const ACTIVE_DEN_KEY = 'ruckus.activeDen';
const storage = () => {
  try { return require('@react-native-async-storage/async-storage').default as {
    getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void>;
  }; } catch { return null; }
};
const rememberDen = (id: string | null) => {
  const st = storage();
  if (!st) return;
  (id ? st.setItem(ACTIVE_DEN_KEY, id) : st.removeItem(ACTIVE_DEN_KEY)).catch(() => {});
};
const rememberedDen = async () => { try { return (await storage()?.getItem(ACTIVE_DEN_KEY)) ?? null; } catch { return null; } };

const Ctx = createContext<StashState | null>(null);

export function StashProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>('loading');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [den, setDen] = useState<Den | null>(null);
  const [dens, setDens] = useState<Den[]>([]);
  const [capacity, setCapacity] = useState<DenCapacity | null>(null);
  const [denAllowance, setDenAllowance] = useState<DenAllowance | null>(null);
  const [stash, setStash] = useState<StashItem[]>([]);
  const [capers, setCapers] = useState<Caper[]>([]);
  const [filter, setFilterState] = useState<Filter>({ kind: 'everyone' });
  const [category, setCategoryState] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('nearby');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [isPro, setIsPro] = useState(false);

  /**
   * `quiet` reloads without touching `loading` or `error`. Use it for realtime
   * updates and rollbacks, so the list stays on screen and a failed reload
   * keeps the Stash already loaded.
   */
  const loadStash = useCallback(async (denId: string, quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const [items, plans] = await Promise.all([api.getStash(denId), api.getCapers(denId)]);
      setStash(items);
      setCapers(plans);
      // not awaited, and never an error on screen: the count is a nicety
      api.getCapacity(denId).then(setCapacity).catch(() => setCapacity(null));
    } catch {
      if (!quiet) setError("Couldn't load your Stash.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (preferDenId?: string) => {
    try {
      const me = await api.auth.userId();
      setCurrentUserId(me);
      /** Not awaited, so a slow or failed billing call does not delay the session. */
      identify(me).then(pro => {
        setIsPro(pro);
        // RevenueCat says Pro: make sure the server agrees, in case a webhook was missed
        if (pro) api.syncPro().catch(() => {});
      });
      if (!me) { setSession('signedOut'); setDen(null); setDens([]); setStash([]); rememberDen(null); return; }
      const mine = await api.myDens();
      setDens(mine);
      api.getDenAllowance().then(setDenAllowance).catch(() => setDenAllowance(null));
      if (mine.length === 0) { setSession('noDen'); setDen(null); setStash([]); return; }
      // Order of preference: `preferDenId`, then the remembered Den, then the newest.
      const wanted = preferDenId ?? await rememberedDen();
      const active = mine.find(d => d.id === wanted) ?? mine[0];
      setDen(active);
      rememberDen(active.id);
      setSession('ready');
      await loadStash(active.id);
    } catch {
      setSession('signedOut');
    }
  }, [loadStash]);

  const switchDen = useCallback(async (denId: string) => {
    const target = dens.find(d => d.id === denId);
    if (!target || target.id === den?.id) return;
    // The person filter and the selection refer to the previous Den, so reset both.
    setFilterState({ kind: 'everyone' });
    setSelectedId(null);
    setCapacity(null);
    setDen(target);
    rememberDen(target.id);
    await loadStash(target.id);
  }, [dens, den, loadStash]);

  useEffect(() => { refreshSession(); }, [refreshSession]);
  useEffect(() => onProChange(setIsPro), []);

  const openPro = useCallback(async () => {
    if (isPro) { await showCustomerCenter(); return true; }
    if (!(await showPaywall())) return false;
    setIsPro(true);
    // don't make them wait for the webhook: tell the server now
    return api.syncPro();
  }, [isPro]);

  /** Reloads quietly when another member saves, votes or comments. */
  useEffect(() => {
    if (!den) return;
    return api.onStashChange(den.id, () => { loadStash(den.id, true); });
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
  const upcoming = useMemo(() => {
    const today = isoDay(new Date());
    const byPlace = new Map(stash.map(s => [s.placeId, s]));
    return capers
      .filter(c => c.date >= today && byPlace.has(c.placeId))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(caper => ({ caper, place: byPlace.get(caper.placeId)! }));
  }, [capers, stash]);
  const caperByPlace = useMemo(() => new Map(upcoming.map(u => [u.caper.placeId, u.caper])), [upcoming]);
  /** A place with a Caper is a plan already, so it leaves this list. */
  const nearlyPlans = useMemo(
    () => stash.filter(s => isNearlyAPlan(s) && !caperByPlace.has(s.placeId)),
    [stash, caperByPlace],
  );

  /** Filters the list rows only. The map keeps every pin and draws the filtered-out ones as dots. */
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
    if (sort !== 'date') return list;
    /** Date order is the calendar: Capers first, soonest at the top, then the rest by newest save. */
    return [...list].sort((a, b) => {
      const ca = caperByPlace.get(a.placeId), cb = caperByPlace.get(b.placeId);
      if (ca && cb) return ca.date.localeCompare(cb.date);
      if (ca || cb) return ca ? -1 : 1;
      return b.savedAt.localeCompare(a.savedAt);
    });
  }, [stash, filter, category, query, sort, caperByPlace]);

  const setFilter = useCallback((f: Filter) => { setFilterState(f); setSelectedId(null); }, []);
  const setCategory = useCallback((c: Category | null) => { setCategoryState(c); setSelectedId(null); }, []);

  /** Optimistic update. The change applies locally and the Stash reloads only if the write fails. */
  const patch = useCallback((id: string, fn: (s: StashItem) => StashItem) => {
    setStash(prev => prev.map(s => (s.id === id ? fn(s) : s)));
  }, []);
  const orReload = useCallback(async (p: Promise<unknown>) => {
    try { await p; } catch { if (den) loadStash(den.id, true); }
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

  /**
   * Screens pass the item's `id`. The write uses its `placeId`. The two are
   * equal on the real backend and differ in the mock.
   */
  const addTake = useCallback((id: string, text: string) => {
    const item = stash.find(s => s.id === id);
    if (!item || !den || !currentUserId) return;
    const take = { userId: currentUserId, text, at: new Date().toISOString() };
    /** One take per person per place. Adding again replaces the existing one, matching the backend. */
    patch(id, s => ({ ...s, takes: [...s.takes.filter(t => t.userId !== currentUserId), take] }));
    orReload(api.addTake(den.id, item.placeId, text));
  }, [stash, den, currentUserId, patch, orReload]);

  const updateTake = useCallback((id: string, text: string) => {
    const item = stash.find(s => s.id === id);
    if (!item || !den || !currentUserId) return;
    patch(id, s => ({ ...s, takes: s.takes.map(t => (t.userId === currentUserId ? { ...t, text } : t)) }));
    orReload(api.updateTake(den.id, item.placeId, text));
  }, [stash, den, currentUserId, patch, orReload]);

  const deleteTake = useCallback((id: string) => {
    const item = stash.find(s => s.id === id);
    if (!item || !den || !currentUserId) return;
    patch(id, s => ({ ...s, takes: s.takes.filter(t => t.userId !== currentUserId) }));
    orReload(api.deleteTake(den.id, item.placeId));
  }, [stash, den, currentUserId, patch, orReload]);

  const openReminder = useCallback(async (denId: string, placeId: string) => {
    try {
      const dens = await api.myDens();
      const target = dens.find(d => d.id === denId);
      if (!target) {
        setOverlay({ kind: 'missing-event' });
        return;
      }
      setDen(target);
      rememberDen(target.id);
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
    api.getCapacity(den.id).then(setCapacity).catch(() => {});
    return saved;
  }, [den]);

  const createCaper = useCallback(async (
    { id, date, time, going }: { id: string; date: string; time: string | null; going: string[] },
  ) => {
    const item = stash.find(s => s.id === id);
    if (!item || !den) throw new Error('place_not_in_stash');
    if (!item.iWant) throw new Error('not_going');
    const caper = await api.createCaper({ denId: den.id, placeId: item.placeId, date, time, going });
    setCapers(prev => [...prev.filter(c => c.id !== caper.id), caper]);
    return caper;
  }, [stash, den]);

  const signOut = useCallback(async () => {
    await unregisterCurrentPushToken();
    await markSignedOut();
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
    visible, nearlyPlans, upcoming, caperByPlace, createCaper, memberById, savedCountBy, overlay,
    isPro, openPro, capacity, denAllowance,
    setFilter, setCategory, setQuery, setSort,
    select: setSelectedId,
    toggleInterest,
    addTake, updateTake, deleteTake,
    addToStash,
    openOverlay: setOverlay,
    openReminder,
    dens, switchDen,
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
