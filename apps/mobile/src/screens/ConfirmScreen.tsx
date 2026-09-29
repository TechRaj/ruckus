/**
 * Confirmation step. Shows one match when confident, up to three otherwise, and search when there are none.
 * CLAUDE.md §5.8: nothing is saved until the user picks a place and confirms.
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
import { EmptyState } from '../components/EmptyState';
import {
  IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconSearch, PawPrint,
} from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { SheetModal } from '../components/SheetModal';
import { Sniffing } from '../components/Sniffing';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, radius, space, type } from '../theme/tokens';
import { PlaceCandidate } from '../types';
import type { ConfirmMode } from '../api/types';

type Mode = 'resolving' | 'pick' | 'search' | 'saving';

export function ConfirmScreen({
  sharedUrl, startInSearch, onClose, onBack, onSaved,
}: {
  sharedUrl: string | null;
  startInSearch?: boolean;
  onClose: () => void;
  /** Where Back goes when there are no matches to return to. */
  onBack: () => void;
  onSaved: (name: string) => void;
}) {
  const { addToStash, isPro, openPro } = useStash();
  const picker = useDenPicker();
  const [mode, setMode] = useState<Mode>(startInSearch ? 'search' : 'resolving');
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  /** The pipeline's own call on how sure it is (CLAUDE.md §5.8). The screen follows it. */
  const [linkMode, setLinkMode] = useState<ConfirmMode | null>(null);
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
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
        setChosen(c[0]?.placeId ?? null);
        setMode('pick');
      })
      .catch(() => { if (live) setFailed(true); });
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
      setChosen(fromLink[0].placeId);
      setPickedBySearch(false);
      setExpanded(true);
      setMode('pick');
    } else {
      onBack();
    }
  };

  async function save(retried = false) {
    if (!chosen) return;
    const all = [...(candidates ?? []), ...results];
    const name = all.find(c => c.placeId === chosen)?.name ?? 'That place';
    const back = candidates ? 'pick' : 'search';
    setMode('saving'); setLimitNote(null);
    try {
      await addToStash(chosen, sharedUrl);
      onSaved(name);
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
                onPress={() => { setFailed(false); setChosen(null); setMode('search'); }}
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
            onPress={leaveSearch} hitSlop={12} style={styles.back}
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
                setCandidates([r]);
                setChosen(r.placeId);
                setPickedBySearch(true);
                setExpanded(false);
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
            <PawPrint size={30} />
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
  const shown = confident && !expanded ? list.slice(0, 1) : list.slice(0, 3);
  const hidden = list.length - shown.length;

  return (
    <SheetModal onClose={onClose} height={0.9} dismissable={mode !== 'saving'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode} alwaysBounceVertical>
        <Kicker>{sharedUrl && !pickedBySearch ? 'From the link you shared' : 'From your search'}</Kicker>
        <Text style={styles.headline}>
          {confident && !expanded ? 'Think I found it' : 'Which one did you mean?'}
        </Text>

        <View style={{ height: 20 }} />

        {shown.map(c => {
          const on = chosen === c.placeId;
          return (
            <PressableScale
              key={c.placeId}
              onPress={() => setChosen(c.placeId)}
              scaleTo={0.985}
              haptic="selection"
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={styles.cardTile}>
                <CategoryGlyph category={c.category} size={24} color={colors.ink} />
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.name} numberOfLines={2}>{c.name}</Text>
                <Text style={styles.address} numberOfLines={2}>{c.address}</Text>
                {c.reason ? <Text style={styles.reason}>{c.reason}</Text> : null}
              </View>
              {on ? (
                <View style={styles.tick}><IconCheck size={14} color={colors.onFlare} /></View>
              ) : null}
            </PressableScale>
          );
        })}

        {hidden > 0 ? (
          <Pressable
            onPress={() => setExpanded(true)}
            style={({ pressed }) => [styles.more, pressed && { backgroundColor: colors.paperSunk }]}
          >
            <Text style={styles.moreLabel}>Not right? See {hidden} other match{hidden === 1 ? '' : 'es'}</Text>
            <IconChevronDown />
          </Pressable>
        ) : null}

        <TextButton label="None of these? Search for it" onPress={() => setMode('search')} muted />
      </ScrollView>

      <View style={styles.footer}>
        <DenMenu {...picker} />
        <View style={styles.savingTo}>
          <Kicker>Saving to</Kicker>
          <DenPill {...picker} />
        </View>
        {limitNote ? <Hint style={styles.limitNote}>{limitNote}</Hint> : null}
        <PrimaryButton
          label="Add to Stash"
          onPress={() => save()}
          loading={mode === 'saving'}
          disabled={!chosen}
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
  name: { ...type.rowTitle, fontSize: 19, color: colors.ink },
  address: { ...type.meta, fontSize: 14, lineHeight: 19, color: colors.inkSecondary, marginTop: 2 },
  reason: { ...type.meta, color: colors.inkMuted, marginTop: 7 },
  tick: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.flare,
    alignItems: 'center', justifyContent: 'center',
  },
  more: {
    height: 54, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  moreLabel: { ...type.chip, color: colors.inkSecondary },
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
  searchFoot: { alignItems: 'center', gap: space.md, padding: 30 },
});
