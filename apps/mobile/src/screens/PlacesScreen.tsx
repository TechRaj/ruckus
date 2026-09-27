/**
 * The most important screen in the app — §4.
 *
 * The map and the list are one screen, not two features. The sheet slides
 * between three detents and the map never fully dies: even at full extension
 * a sliver stays visible, and the sheet is the one pane of glass, so the map
 * ghosts through it.
 *
 * Selection syncs both ways. Tapping a pin scrolls the sheet to that row;
 * tapping a row pans the map and pops the pin. Neither owns the state — both
 * read StashContext. The numbers live in useSheetGeometry, the camera in
 * useMapCamera, the copy in describeView; this file is composition.
 */
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../components/Buttons';
import { Hint, Kicker, RoundButton, ScreenHeader, SortToggle } from '../components/Chrome';
import { EmptyState } from '../components/EmptyState';
import { FilterChips } from '../components/FilterChips';
import { GlassSheetBackground } from '../components/GlassSheetBackground';
import { Grain } from '../components/Grain';
import { IconPlus, PawPrint } from '../components/Icons';
import { MapControls } from '../components/MapControls';
import { PlaceRow, ROW_HEIGHT } from '../components/PlaceRow';
import { RascalPeek } from '../components/RascalPeek';
import { useStashMarkers } from '../hooks/useStashMarkers';
import { StashSearch } from '../components/StashSearch';
import { TORONTO, useMapCamera } from '../hooks/useMapCamera';
import { useSheetGeometry } from '../hooks/useSheetGeometry';
import { describeView } from '../state/stashCopy';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { EASE_DRAWER, tapSelection, useReduceMotion } from '../theme/motion';
import { colors, layout, motion, space, type } from '../theme/tokens';
import { StashItem } from '../types';

export function PlacesScreen() {
  const {
    loading, error, den, stash, visible, memberById,
    filter, category, query, sort, selectedId, currentUserId,
    select, setFilter, setCategory, setQuery, setSort, openOverlay,
  } = useStash();

  const reduce = useReduceMotion();
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const [detentIndex, setDetentIndex] = useState(1);
  const animatedPosition = useSharedValue(0);

  const geo = useSheetGeometry(animatedPosition);
  const camera = useMapCamera();
  const focusedUser = filter.kind === 'person' ? filter.userId : null;

  /** Pin tapped: pan the map, lift the sheet off peek, scroll to the row. */
  const onPinPress = useCallback((item: StashItem) => {
    /**
     * The pin itself does not animate. A marker is a cached native snapshot,
     * so Reanimated cannot drive it, and selection happens tens of times a
     * session — the haptic carries the feedback instead, and carries it better.
     */
    tapSelection();
    select(item.id === selectedId ? null : item.id);
    if (item.id !== selectedId) {
      camera.panTo(item);
      if (detentIndex === 0) sheetRef.current?.snapToIndex(1);
    }
  }, [select, selectedId, detentIndex, camera]);

  /** Row tapped: same selection, map follows. A second tap opens the place. */
  const onRowPress = useCallback((item: StashItem) => {
    if (item.id === selectedId) { openOverlay({ kind: 'detail', id: item.id }); return; }
    select(item.id);
    camera.panTo(item);
  }, [select, selectedId, camera, openOverlay]);

  /** The other half of the two-way sync: scroll the list to the selection. */
  useEffect(() => {
    if (!selectedId) return;
    const index = visible.findIndex(s => s.id === selectedId);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
      });
    }
  }, [selectedId, visible]);

  const markers = useStashMarkers({
    stash, focusedUser, category, selectedId, memberById, onPress: onPinPress,
  });

  const { kicker, headline, emptyLine } = describeView({
    filter, category, query,
    who: focusedUser ? memberById.get(focusedUser)?.displayName ?? null : null,
    visibleCount: visible.length,
    stashEmpty: stash.length === 0,
  });
  const open = detentIndex > 0;

  return (
    <View style={styles.root}>
      <MapView
        ref={camera.mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={TORONTO}
        onRegionChangeComplete={camera.onRegionChangeComplete}
        /**
         * react-native-maps 1.27 declares this prop as `showsPointsOfInterests`
         * in its typings while the native module exports `showsPointsOfInterest`.
         * Spelling it the library's way type-checks and silently does nothing,
         * so pass the name the native side actually reads.
         */
        {...({ showsPointsOfInterest: false } as object)}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: layout.sheetPeek, left: 0 }}
        onPress={() => select(null)}
      >
        {markers}
      </MapView>

      {/* Grain and a soft vignette so the basemap reads as a place, not a diagram. */}
      <Grain vignette />

      {/* Apple Maps cannot be custom-styled (§11.2); a paper veil keeps the title legible. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.paper, colors.paper + 'D9', colors.paper + '00']}
        locations={[0, 0.55, 1]}
        style={[styles.veil, { height: geo.insets.top + 130 }]}
      />
      <ScreenHeader
        kicker={den?.name ?? 'Ruckus'}
        title="Places"
        style={{ position: 'absolute', top: geo.insets.top + 14, left: 0, right: 0 }}
      />
      <MapControls top={geo.insets.top + 132} onZoom={camera.zoom} onRecentre={camera.recentre} />

      {/* Rascal props his paws on the sheet at peek, and ducks once it opens. */}
      <RascalPeek animatedPosition={animatedPosition} peekTop={geo.peekTop} halfTop={geo.halfTop} />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={geo.snapPoints}
        /** v5 defaults to dynamic sizing, which ignores snapPoints. The detents are the design. */
        enableDynamicSizing={false}
        /**
         * The default spring settles differently depending on how hard you
         * flick, which read as unpredictable. The iOS drawer curve lands the
         * same way every time; Reduce Motion collapses it to a near-instant move.
         */
        animationConfigs={{ duration: reduce ? 1 : motion.sheet, easing: EASE_DRAWER }}
        animatedPosition={animatedPosition}
        onChange={setDetentIndex}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={styles.handle}
        /** The shadow and the glass live on the background; nothing inside it animates. */
        backgroundComponent={GlassSheetBackground}
      >
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Kicker>{kicker}</Kicker>
            <Text style={styles.headline}>{headline}</Text>
          </View>
          <Animated.View style={geo.sortStyle} pointerEvents={open ? 'auto' : 'none'}>
            <SortToggle value={sort} onChange={setSort} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.peekHint, geo.hintStyle]} pointerEvents="none">
          <Hint>{lines.hint.pullUp}</Hint>
        </Animated.View>

        {/**
          * Never gate this behind the detent: BottomSheetFlatList registers
          * itself as the sheet's scrollable when it mounts, and mounting it
          * after the sheet had moved left the sheet without one.
          */}
        <View style={styles.content}>
          <View style={styles.chipRow}>
            <FilterChips
              members={den?.members ?? []}
              active={filter}
              onChange={setFilter}
              currentUserId={currentUserId}
              category={category}
              onCategory={setCategory}
            />
          </View>
          {/* Search takes input at the full detent only; focusing it lifts the sheet. */}
          <Animated.View style={geo.searchStyle} pointerEvents={detentIndex === 2 ? 'auto' : 'none'}>
            <StashSearch value={query} onChange={setQuery} onFocus={() => sheetRef.current?.snapToIndex(2)} />
          </Animated.View>
          <View style={styles.divider} />

          {loading ? (
            <View style={styles.centre}><ActivityIndicator color={colors.inkMuted} /></View>
          ) : error ? (
            <View style={styles.centre}><Text style={styles.error}>{error}</Text></View>
          ) : visible.length === 0 ? (
            <EmptyState
              line={emptyLine}
              action={stash.length === 0
                ? <PrimaryButton label="Add a place" onPress={() => openOverlay({ kind: 'add' })} />
                : undefined}
            />
          ) : (
            <BottomSheetFlatList
              ref={listRef}
              data={visible}
              keyExtractor={i => i.id}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              onScrollToIndexFailed={() => {}}
              /** A bounded height, or the list never scrolls and never hands the drag back. */
              style={styles.listFlex}
              contentContainerStyle={{ paddingBottom: geo.listPaddingBottom }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <PlaceRow
                  item={item}
                  savedBy={memberById.get(item.savedBy)}
                  selected={selectedId === item.id}
                  onPress={() => onRowPress(item)}
                />
              )}
              ListFooterComponent={
                <View style={styles.footer}>
                  <PawPrint size={32} />
                  <Hint>{lines.hint.endOfStash}</Hint>
                </View>
              }
            />
          )}
        </View>
      </BottomSheet>

      {/**
        * The only way to add a place — screen-anchored, not sheet-anchored.
        * Adding is a global verb, and a global verb wants one home you can
        * build muscle memory for (§13.8).
        */}
      <View style={styles.addFab} pointerEvents="box-none">
        <RoundButton size={64} tone="flare" onPress={() => openOverlay({ kind: 'add' })} accessibilityLabel="Add a place">
          <IconPlus size={28} color={colors.ink} />
        </RoundButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mapLand },
  handle: { backgroundColor: colors.hairline, width: 44, height: 5 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: 2,
  },
  headline: { ...type.displaySm, fontSize: 28, lineHeight: 33, color: colors.ink, marginTop: 6 },
  chipRow: { height: 62, justifyContent: 'center' },
  /** Sits in the space the chip row occupies once the sheet opens. */
  peekHint: { position: 'absolute', left: space.xl, top: 84 },
  addFab: { position: 'absolute', right: space.xl, bottom: space.xl, zIndex: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginTop: 4 },
  content: { flex: 1 },
  listFlex: { flex: 1 },
  centre: { padding: space.xl, alignItems: 'center', gap: space.sm },
  error: { ...type.bodyMed, color: colors.inkSecondary, textAlign: 'center' },
  footer: { alignItems: 'center', gap: space.md, paddingVertical: 30 },
});
