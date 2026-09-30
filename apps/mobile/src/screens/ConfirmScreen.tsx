/**
 * Confirmation step. Every match the link produced is listed as a card that
 * can be ticked, with the pipeline's best guess ticked already. When it is
 * sure of one place, that card leads and the rest sit under "Other matches".
 * With no matches the screen goes to search.
 * CLAUDE.md §5.8: nothing is saved until the user picks and confirms.
 */
import { useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { Hint, keyboardDismissMode, Kicker } from '../components/Chrome';
import { DenMenu, DenPill, useDenPicker } from '../components/DenPicker';
import { MonthCalendar } from '../components/MonthCalendar';
import { EmptyState } from '../components/EmptyState';
import {
  IconCheck, IconChevronLeft, IconChevronRight, IconSearch,
} from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { RascalSleep } from '../components/RascalSleep';
import { SheetModal } from '../components/SheetModal';
import { Sniffing } from '../components/Sniffing';
import { dayLabel, dotted, eventLabel, eventOver } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { playFail, playTap } from '../theme/sound';
import { colors, font, radius, space, type } from '../theme/tokens';
import { PlaceCandidate } from '../types';
import type { ConfirmMode } from '../api/types';

type Mode = 'resolving' | 'pick' | 'search' | 'saving';

/** The backend takes up to 20 places in one save. */
const MOST = 20;

/**
 * What starts ticked. An itinerary starts with every place the pipeline is
 * sure of. Anything else starts with the first match only.
 */
const firstTicks = (list: PlaceCandidate[], mode: ConfirmMode | null) =>
  (mode === 'multi'
    ? list.filter(c => c.tier !== 'low')
    : list.slice(0, 1)
  ).slice(0, MOST).map(c => c.placeId);

export function ConfirmScreen({
  sharedUrl, startInSearch, initialQuery, onClose, onBack, onSaved,
}: {
  sharedUrl: string | null;
  startInSearch?: boolean;
  /** Text shared without a link - an address, a name - starts the search with it. */
  initialQuery?: string;
  onClose: () => void;
  /** Where Back goes when there are no matches to return to. */
  onBack: () => void;
  /** `name` is the first place saved, `count` how many were saved together. */
  onSaved: (name: string, count: number) => void;
}) {
  const { addToStash, isPro, openPro, capacity } = useStash();
  const picker = useDenPicker();
  const [mode, setMode] = useState<Mode>(startInSearch ? 'search' : 'resolving');
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  /** The pipeline's own call on how sure it is (CLAUDE.md §5.8). The screen follows it. */
  const [linkMode, setLinkMode] = useState<ConfirmMode | null>(null);
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [query, setQuery] = useState(initialQuery ?? '');
  /** Ticked place ids, in the order they are listed. */
  const [chosen, setChosen] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  /** Days picked for places the link gave no date for, keyed by place id, as YYYY-MM-DD. */
  const [dates, setDates] = useState<Record<string, string>>({});
  /** The place whose calendar is open. One at a time keeps the list short. */
  const [dating, setDating] = useState<string | null>(null);
  /** Message shown when a save is refused because the Den is at its free limit. */
  const [limitNote, setLimitNote] = useState<string | null>(null);
  /** The matches the link produced, kept so Back from search can return to them. */
  const [fromLink, setFromLink] = useState<PlaceCandidate[] | null>(null);
  /** True when the card on screen came from search, false when it came from the link. */
  const [pickedBySearch, setPickedBySearch] = useState(false);
  /** The query the current results belong to. The empty message shows only when this equals the typed query. */
  const [answered, setAnswered] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (startInSearch || !sharedUrl) return;
    let live = true;
    api.resolveSharedUrl(sharedUrl)
      .then(({ candidates: c, mode: m }) => {
        if (!live) return;
        /** No candidates, so go to search. */
        if (m === 'search' || c.length === 0) { setMode('search'); return; }
        setCandidates(c);
        setLinkMode(m);
        setFromLink(c);
        setChosen(firstTicks(c, m));
        setMode('pick');
      })
      .catch(() => { if (live) { setFailed(true); playFail(); } });
    return () => { live = false; };
  }, [sharedUrl, startInSearch]);

  /** Debounced. Each search is a paid geocode against a daily cap, and per-keystroke requests make the list flicker. */
  useEffect(() => {
    if (mode !== 'search') return;
    let live = true;
    const asked = query.trim();
    setSearchError(null);
    const t = setTimeout(() => {
      api.searchPlaces(asked, { fromLink: !!sharedUrl })
        .then(r => { if (live) { setResults(r); setAnswered(asked); } })
        .catch(err => {
          if (!live) return;
          setResults([]);
          setSearchError((err as { code?: string }).code === 'daily_limit_reached'
            ? lines.searchLimit : lines.searchFailed);
        });
    }, asked ? 350 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [mode, query, sharedUrl]);

  /** Back from search returns to the link's matches if there are any, otherwise to Add a place. */
  const leaveSearch = () => {
    if (fromLink?.length) {
      setCandidates(fromLink);
      setChosen(firstTicks(fromLink, linkMode));
      setPickedBySearch(false);
      setMode('pick');
    } else {
      onBack();
    }
  };

  async function save(retried = false) {
    if (chosen.length === 0) return;
    const all = [...(candidates ?? []), ...results];
    const name = all.find(c => c.placeId === chosen[0])?.name ?? 'That place';
    const back = candidates ? 'pick' : 'search';
    setMode('saving'); setLimitNote(null);
    try {
      await addToStash(chosen, sharedUrl, dates);
      onSaved(name, chosen.length);
    } catch (err) {
      // A full Den is a limit, so keep the pick on screen and skip the
      // failed state.
      const e = err as { code?: string; needsUpgrade?: boolean; message?: string };
      if (e.needsUpgrade) {
        setMode(back);
        // Already Pro (the server just hadn't heard yet) -> sync it. Not Pro ->
        // the paywall, which syncs on purchase. Either way, if the server now
        // agrees, save again once so they don't have to tap twice.
        const ready = isPro ? await api.syncPro() : await openPro();
        if (ready && !retried) return save(true);
        if (isPro) setLimitNote('Your upgrade is on its way. Try again in a few seconds.');
        return;
      }
      if (e.code === 'den_full') { setMode(back); setLimitNote(e.message ?? 'This Den is full.'); return; }
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <SheetModal onClose={onClose} height={0.5} dragAnywhere>
        <View style={styles.centre}>
          <EmptyState
            line={lines.hiding}
            action={
              <PrimaryButton
                label="Search instead"
                onPress={() => { setFailed(false); setChosen([]); setMode('search'); }}
              />
            }
          />
          <TextButton label="Close" onPress={onClose} muted />
        </View>
      </SheetModal>
    );
  }

  if (mode === 'resolving') {
    return (
      <SheetModal onClose={onClose} height={0.62} dragAnywhere>
        <Sniffing url={sharedUrl} />
      </SheetModal>
    );
  }

  if (mode === 'search') {
    return (
      <SheetModal onClose={onClose} height={0.88}>
        <View style={styles.searchHead}>
          <Pressable
            onPress={() => { playTap(); leaveSearch(); }} hitSlop={12} style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={fromLink?.length ? 'Back to the matches' : 'Back to Add a place'}
          >
            <IconChevronLeft />
          </Pressable>
          <Text style={[styles.headline, { marginTop: 0 }]}>Search for it</Text>
          <View style={styles.searchField}>
            <IconSearch size={20} color={colors.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="A place or an address"
              placeholderTextColor={colors.inkMuted}
              autoFocus
              returnKeyType="search"
              blurOnSubmit
              style={styles.searchInput}
            />
          </View>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode} alwaysBounceVertical
          /** Without this the last results are hidden under the keyboard. */
          automaticallyAdjustKeyboardInsets
        >
          {searchError ? <Hint style={styles.searchNote}>{searchError}</Hint> : null}
          {!searchError && query.trim() && answered === query.trim() && results.length === 0
            ? <Hint style={styles.searchNote}>{lines.emptySearch(query.trim())}</Hint> : null}
          {results.map(r => (
            <Pressable
              key={r.placeId}
              onPress={() => {
                playTap();
                setCandidates([r]);
                setChosen([r.placeId]);
                setPickedBySearch(true);
                setMode('pick');
              }}
              style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.paperSunk }]}
            >
              <View style={styles.resultTile}>
                <CategoryGlyph category={r.category} size={22} color={colors.ink} />
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultName} numberOfLines={2}>{r.name}</Text>
                <Text style={styles.address} numberOfLines={2}>{r.address}</Text>
              </View>
              <IconChevronRight />
            </Pressable>
          ))}
          <View style={styles.searchFoot}>
            <RascalSleep />
            <Hint style={{ textAlign: 'center' }}>{lines.hint.stillNothing}</Hint>
          </View>
        </ScrollView>
      </SheetModal>
    );
  }

  const list = candidates ?? [];
  // 'single' is the pipeline saying one place is clearly it; 'choose' means
  // several are plausible - two cafés named in one reel - so show them all.
  // A place picked from search is settled: they chose it.
  const confident = Boolean(list[0]) && (pickedBySearch || linkMode === 'single');
  /** An itinerary reel names several places that all belong. Every one is listed. */
  const itinerary = !pickedBySearch && linkMode === 'multi';
  /** Every match is on screen from the start, so adding a second place is one tap. */
  const shown = list.slice(0, 8);
  /** When the pipeline is sure of one place, the others are set apart under their own label. */
  const leads = confident && !itinerary && shown.length > 1;
  /** With one card it is a yes or no. With several, any number can be ticked. */
  const several = shown.length > 1;

  const toggle = (placeId: string) => {
    if (!several) { setChosen([placeId]); return; }
    const next = chosen.includes(placeId) ? chosen.filter(id => id !== placeId) : [...chosen, placeId];
    /** Kept in list order, so the first place named is the first one saved. */
    setChosen(shown.map(c => c.placeId).filter(id => next.includes(id)).slice(0, MOST));
    setLimitNote(null);
  };
  const allTicked = chosen.length === Math.min(shown.length, MOST);

  /** Room left in the Den, or null when there is no limit. */
  const room = capacity?.placeLimit == null ? null : Math.max(0, capacity.placeLimit - capacity.places);
  const overRoom = room !== null && chosen.length > room;

  return (
    <SheetModal onClose={onClose} height={0.9} dismissable={mode !== 'saving'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode} alwaysBounceVertical>
        <Kicker>{sharedUrl && !pickedBySearch ? 'From the link you shared' : 'From your search'}</Kicker>
        <Text style={styles.headline}>
          {itinerary ? `Found ${list.length} places`
            : confident ? 'Think I found it'
            : 'Which did you mean?'}
        </Text>

        {several ? (
          <View style={styles.tally}>
            <Hint>{leads && chosen.length === 1
              ? 'tap any other to add it too.'
              : `${chosen.length} of ${shown.length} ticked. tap to add or leave out.`}</Hint>
            <Pressable
              onPress={() => { playTap(); setChosen(allTicked ? [] : shown.slice(0, MOST).map(c => c.placeId)); }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.tallyAction}>{allTicked ? 'Clear' : 'Tick all'}</Text>
            </Pressable>
          </View>
        ) : <View style={{ height: 20 }} />}

        {shown.map((c, i) => {
          const on = chosen.includes(c.placeId);
          return (
            <View key={c.placeId}>
            {leads && i === 1 ? <Kicker style={styles.others}>Other matches</Kicker> : null}
            <PressableScale
              onPress={() => toggle(c.placeId)}
              scaleTo={0.985}
              haptic="selection"
              accessibilityRole={several ? 'checkbox' : 'radio'}
              accessibilityState={several ? { checked: on } : { selected: on }}
              accessibilityLabel={[c.name, c.headline, eventLabel(c.when), c.address].filter(Boolean).join(', ')}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={styles.cardTile}>
                <CategoryGlyph category={c.category} size={24} color={colors.ink} />
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.name} numberOfLines={2}>{c.name}</Text>
                <Text style={styles.address} numberOfLines={2}>{c.address}</Text>
                {/* what's on and when - for a pop-up that's the reason to save it, and
                    a date that's already gone by should be seen before saving, not after */}
                {c.headline || eventLabel(c.when) ? (
                  <Text style={[styles.happening, eventOver(c.when) && styles.happeningOver]} numberOfLines={2}>
                    {dotted(c.headline, eventLabel(c.when))}
                  </Text>
                ) : null}
                {c.reason ? <Text style={styles.reason}>{c.reason}</Text> : null}
              </View>
              {/* With several cards the empty circle stays, so an unticked card still reads as tickable. */}
              {on ? (
                <View style={styles.tick}><IconCheck size={14} color={colors.onFlare} /></View>
              ) : several ? <View style={[styles.tick, styles.tickOff]} /> : null}
            </PressableScale>
            {/* No date in the caption: the user can pick one. Outside the card, so the calendar does not tick it. */}
            {on && !c.when ? (
              <View style={styles.dateRow}>
                {dates[c.placeId] ? (
                  <View style={styles.dateLine}>
                    <Text style={styles.dateChosen}>{dayLabel(dates[c.placeId])}</Text>
                    <TextButton label={dating === c.placeId ? 'Done' : 'Change'} onPress={() => setDating(dating === c.placeId ? null : c.placeId)} muted />
                    <TextButton label="Remove" onPress={() => { setDates(({ [c.placeId]: _, ...rest }) => rest); setDating(null); }} muted />
                  </View>
                ) : (
                  <TextButton label={dating === c.placeId ? 'No date after all' : 'Add a date'} onPress={() => setDating(dating === c.placeId ? null : c.placeId)} muted />
                )}
                {dating === c.placeId ? (
                  <MonthCalendar value={dates[c.placeId] ?? null} onChange={day => setDates(prev => ({ ...prev, [c.placeId]: day }))} />
                ) : null}
              </View>
            ) : null}
            </View>
          );
        })}

        <TextButton label="None of these? Search for it" onPress={() => setMode('search')} muted />
      </ScrollView>

      <View style={styles.footer}>
        <DenMenu {...picker} />
        <View style={styles.savingTo}>
          <Kicker>Saving to</Kicker>
          <DenPill {...picker} />
        </View>
        {limitNote ? <Hint style={styles.limitNote}>{limitNote}</Hint>
          : overRoom ? <Hint style={styles.limitNote}>{lines.room.tooMany(room ?? 0)}</Hint> : null}
        <PrimaryButton
          label={chosen.length > 1 ? `Add ${chosen.length} to Stash` : 'Add to Stash'}
          onPress={() => save()}
          loading={mode === 'saving'}
          disabled={chosen.length === 0}
        />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  limitNote: { textAlign: 'center', marginBottom: space.sm },
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: space.sm, paddingHorizontal: space.xl, paddingBottom: 40,
  },
  scroll: { paddingHorizontal: space.xl, paddingTop: 6, paddingBottom: space.lg },
  headline: { ...type.displaySm, fontSize: 30, lineHeight: 35, color: colors.ink, marginTop: 8 },
  card: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    padding: 17, borderRadius: radius.xl, marginBottom: 11,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
  },
  cardOn: { borderColor: colors.flareDeep, borderWidth: 2, backgroundColor: colors.flareWash },
  cardTile: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  tally: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.md, paddingTop: space.sm, paddingBottom: space.md,
  },
  tallyAction: { ...type.chip, fontSize: 14, color: colors.ink },
  name: { ...type.rowTitle, fontSize: 19, color: colors.ink },
  address: { ...type.meta, fontSize: 14, lineHeight: 19, color: colors.inkSecondary, marginTop: 2 },
  happening: { ...type.meta, fontSize: 14, lineHeight: 19, fontFamily: font.bold, color: colors.ink, marginTop: 6 },
  dateRow: { marginTop: -4, marginBottom: space.md },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md },
  dateChosen: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  happeningOver: { color: colors.warn },
  reason: { ...type.meta, color: colors.inkMuted, marginTop: 7 },
  tick: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.flare,
    alignItems: 'center', justifyContent: 'center',
  },
  tickOff: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.hairline },
  others: { marginTop: space.sm, marginBottom: space.md },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
    paddingHorizontal: space.xl, paddingTop: 14, paddingBottom: space.md,
    backgroundColor: colors.paper,
  },
  savingTo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingBottom: 13, paddingTop: space.sm,
  },
  searchHead: { paddingHorizontal: space.xl, paddingBottom: 14 },
  back: { width: 44, height: 40, justifyContent: 'center', marginLeft: -11 },
  searchNote: { paddingHorizontal: space.xl, paddingVertical: space.md },
  searchField: {
    marginTop: 18, height: 56, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: space.lg,
  },
  searchInput: { flex: 1, ...type.bodyMed, fontSize: 16, color: colors.ink },
  result: {
    /** minHeight so a long name or a two-line address can make the row taller. */
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72,
    paddingHorizontal: space.xl, paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  resultTile: {
    width: 48, height: 48, borderRadius: 15, backgroundColor: colors.paperSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  /** minWidth 0 lets the text wrap inside the row instead of pushing the chevron out. */
  resultBody: { flex: 1, minWidth: 0 },
  resultName: { ...type.rowTitle, fontSize: 17, color: colors.ink },
  searchFoot: { alignItems: 'center', gap: space.sm, padding: 30 },
});
