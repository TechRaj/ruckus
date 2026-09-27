/**
 * The confirmation step — §5.7.
 *
 * Three reasons it exists: the ranker won't be confident, the record needs to
 * be created by a person rather than by an extraction pipeline, and every tap
 * is a labelled example.
 *
 * The screen adapts to confidence: one result when sure, three when torn,
 * search when lost. Log which position gets picked — if it's #1 ninety percent
 * of the time, collapse to single-result and save a tap.
 */
import { useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { Hint, keyboardDismissMode, Kicker } from '../components/Chrome';
import { Emblem } from '../components/Emblem';
import { EmptyState } from '../components/EmptyState';
import {
  IconCheck, IconChevronDown, IconChevronRight, IconSearch, PawPrint,
} from '../components/Icons';
import { SheetModal } from '../components/SheetModal';
import { Sniffing } from '../components/Sniffing';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, radius, space, type } from '../theme/tokens';
import { CONFIDENT, PlaceCandidate } from '../types';

type Mode = 'resolving' | 'pick' | 'search' | 'saving';

export function ConfirmScreen({
  sharedUrl, startInSearch, onClose, onSaved,
}: {
  sharedUrl: string | null;
  startInSearch?: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const { den, addToStash, isPro, openPro } = useStash();
  const [mode, setMode] = useState<Mode>(startInSearch ? 'search' : 'resolving');
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Why a save was refused when it isn't a failure: the Den hit its free cap. */
  const [limitNote, setLimitNote] = useState<string | null>(null);

  useEffect(() => {
    if (startInSearch || !sharedUrl) return;
    let live = true;
    api.resolveSharedUrl(sharedUrl)
      .then(({ candidates: c, mode: m }) => {
        if (!live) return;
        /** Nothing pinnable: skip straight to search rather than show an empty pick. */
        if (m === 'search' || c.length === 0) { setMode('search'); return; }
        setCandidates(c);
        setChosen(c[0]?.placeId ?? null);
        setMode('pick');
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [sharedUrl, startInSearch]);

  useEffect(() => {
    if (mode !== 'search') return;
    let live = true;
    api.searchPlaces(query).then(r => { if (live) setResults(r); }).catch(() => {});
    return () => { live = false; };
  }, [mode, query]);

  async function save() {
    if (!chosen) return;
    const all = [...(candidates ?? []), ...results];
    const name = all.find(c => c.placeId === chosen)?.name ?? 'That place';
    const back = candidates ? 'pick' : 'search';
    setMode('saving'); setLimitNote(null);
    try {
      await addToStash(chosen, sharedUrl);
      onSaved(name);
    } catch (err) {
      // A full Den isn't a failed lookup - keep the pick on screen, don't
      // send them to "search instead".
      const e = err as { code?: string; needsUpgrade?: boolean; message?: string };
      if (e.needsUpgrade) {
        setMode(back);
        // Just bought Pro: the app knows at once, the server a few seconds later
        // by webhook. Don't reopen the paywall on someone who has already paid.
        if (isPro) setLimitNote('Your upgrade is on its way. Try again in a few seconds.');
        else await openPro();
        return;
      }
      if (e.code === 'den_full') { setMode(back); setLimitNote(e.message ?? 'This Den is full.'); return; }
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <SheetModal onClose={onClose} height={0.5}>
        <View style={styles.centre}>
          <EmptyState
            line={lines.hiding}
            action={
              <PrimaryButton
                label="Search instead"
                onPress={() => { setFailed(false); setMode('search'); }}
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
      <SheetModal onClose={onClose} height={0.62}>
        <Sniffing url={sharedUrl} />
      </SheetModal>
    );
  }

  if (mode === 'search') {
    return (
      <SheetModal onClose={onClose} height={0.88}>
        <View style={styles.searchHead}>
          <Text style={styles.headline}>Search for it</Text>
          <View style={styles.searchField}>
            <IconSearch size={20} color={colors.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={den ? 'Toronto' : 'Search'}
              placeholderTextColor={colors.inkMuted}
              autoFocus
              returnKeyType="search"
              blurOnSubmit
              style={styles.searchInput}
            />
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode} alwaysBounceVertical>
          {results.map(r => (
            <Pressable
              key={r.placeId}
              onPress={() => {
                setCandidates([r]);
                setChosen(r.placeId);
                setExpanded(false);
                setMode('pick');
              }}
              style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.paperSunk }]}
            >
              <View style={styles.resultTile}>
                <CategoryGlyph category={r.category} size={22} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{r.name}</Text>
                <Text style={styles.address}>{r.address}</Text>
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
  const confident = list[0] && list[0].confidence >= CONFIDENT;
  const shown = confident && !expanded ? list.slice(0, 1) : list.slice(0, 3);
  const hidden = list.length - shown.length;

  return (
    <SheetModal onClose={onClose} height={0.9} dismissable={mode !== 'saving'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode} alwaysBounceVertical>
        <Kicker>{sharedUrl ? 'From the link you shared' : 'From your search'}</Kicker>
        <Text style={styles.headline}>
          {confident && !expanded ? 'Think I found it' : 'Which one did you mean?'}
        </Text>

        <View style={{ height: 20 }} />

        {shown.map(c => {
          const on = chosen === c.placeId;
          return (
            <Pressable
              key={c.placeId}
              onPress={() => setChosen(c.placeId)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={styles.cardTile}>
                <CategoryGlyph category={c.category} size={24} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.address}>{c.address}</Text>
                {c.reason ? <Text style={styles.reason}>{c.reason}</Text> : null}
              </View>
              {on ? (
                <View style={styles.tick}><IconCheck size={14} color={colors.ink} /></View>
              ) : null}
            </Pressable>
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

        <TextButton label="None of these — search for it" onPress={() => setMode('search')} muted />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.savingTo}>
          <Kicker>Saving to</Kicker>
          <View style={styles.denRow}>
            <Emblem name={den?.emblem ?? 'lantern'} size={22} />
            <Text style={styles.denName}>{den?.name}</Text>
            <IconChevronDown size={14} />
          </View>
        </View>
        {limitNote ? <Hint style={styles.limitNote}>{limitNote}</Hint> : null}
        <PrimaryButton
          label="Add to Stash"
          onPress={save}
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
  cardOn: { borderColor: colors.flare, borderWidth: 2, backgroundColor: colors.flareWash },
  cardTile: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  name: { ...type.rowTitle, fontSize: 19, color: colors.ink },
  address: { ...type.meta, fontSize: 14, color: colors.inkSecondary, marginTop: 4 },
  reason: { ...type.meta, color: colors.inkMuted, marginTop: 7 },
  tick: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.flare,
    alignItems: 'center', justifyContent: 'center',
  },
  more: {
    height: 54, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.hairline,
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
    justifyContent: 'space-between', paddingBottom: 13,
  },
  denRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  denName: { ...type.chip, fontSize: 14, color: colors.ink },
  searchHead: { paddingHorizontal: space.xl, paddingBottom: 14 },
  searchField: {
    marginTop: 18, height: 56, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: space.lg,
  },
  searchInput: { flex: 1, ...type.bodyMed, fontSize: 16, color: colors.ink },
  result: {
    flexDirection: 'row', alignItems: 'center', gap: 14, height: 72,
    paddingHorizontal: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  resultTile: {
    width: 48, height: 48, borderRadius: 15, backgroundColor: colors.paperSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  resultName: { ...type.rowTitle, fontSize: 17, color: colors.ink },
  searchFoot: { alignItems: 'center', gap: space.md, padding: 30 },
});
