/**
 * Places tab. A map with a three-detent bottom sheet holding the list (CLAUDE.md §4).
 * Selection is shared through StashContext, so the map and the list both read and set it.
 * Sheet geometry is in useSheetGeometry, the camera in useMapCamera, the copy in describeView.
 */
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../components/Buttons';
import { Hint, keyboardDismissMode, Kicker, RoundButton, ScreenHeader, SortToggle } from '../components/Chrome';
import { EmptyState } from '../components/EmptyState';
import { FilterChips } from '../components/FilterChips';
import { GlassSheetBackground } from '../components/GlassSheetBackground';
import { Grain } from '../components/Grain';
import { IconPlus } from '../components/Icons';
import { MapControls } from '../components/MapControls';
import { MusicButton } from '../components/MusicButton';
import { RascalSleep } from '../components/RascalSleep';
import { PlaceRow, ROW_HEIGHT } from '../components/PlaceRow';
import { RascalPeek } from '../components/RascalPeek';
import { useStashMarkers } from '../hooks/useStashMarkers';
import { StashSearch } from '../components/StashSearch';
import { TORONTO, useMapCamera } from '../hooks/useMapCamera';
import { holdListAt, useListScrollLock } from '../hooks/useListScrollLock';
import { useSheetGeometry } from '../hooks/useSheetGeometry';
import { describeView } from '../state/stashCopy';
import { playTap } from '../theme/sound';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { EASE_DRAWER, tapSelection, useReduceMotion } from '../theme/motion';
import { colors, isNight, layout, motion, space, type } from '../theme/tokens';
import { StashItem } from '../types';

export function PlacesScreen() {
  const { loading, error, den, stash, visible, memberById, filter, category, query, sort, selectedId, currentUserId, select, setFilter, setCategory, setQuery, setSort, openOverlay, caperByPlace, position } = useStash();

  const reduce = useReduceMotion();
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const [detentIndex, setDetentIndex] = useState(1);
  const animatedPosition = useSharedValue(0);

  const geo = useSheetGeometry(animatedPosition);
  const camera = useMapCamera();
  const focusedUser = filter.kind === 'person' ? filter.userId : null;

  /** On pin press, pan the map, raise the sheet from peek, and scroll to the row. */
  const onPinPress = useCallback((item: StashItem) => {
    /** Markers are cached native snapshots that Reanimated cannot animate, so feedback is a haptic and a sound. */
    tapSelection();
    playTap();
    select(item.id === selectedId ? null : item.id);
    if (item.id !== selectedId) {
      camera.panTo(item);
      if (detentIndex === 0) sheetRef.current?.snapToIndex(1);
    }
  }, [select, selectedId, detentIndex, camera]);

  /** On row press, select the place and pan the map. Pressing the selected row opens the detail. */
  const onRowPress = useCallback((item: StashItem) => {
    if (item.id === selectedId) { openOverlay({ kind: 'detail', id: item.id }); return; }
    select(item.id);
    camera.panTo(item);
  }, [select, selectedId, camera, openOverlay]);

  /**
   * Brings the selected row to the top of the list at every detent. Below full
   * height the sheet holds the list in place, so the offset goes through
   * holdListAt and the list jumps there instead of animating.
   */
  const [listHeight, setListHeight] = useState(0);
  const detentRef = useRef(detentIndex);
  detentRef.current = detentIndex;
  useEffect(() => {
    if (!selectedId) return;
    const index = visible.findIndex(s => s.id === selectedId);
    if (index < 0) return;
    const offset = ROW_HEIGHT * index;
    const full = detentRef.current === 2;
    holdListAt(full ? null : offset);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: full });
    });
  }, [selectedId, visible]);

  /**
   * Open on the Den's own pins. Once per Den: after that the user is driving
   * the camera, and a friend's new save shouldn't yank the map away.
   */
  const framedDen = useRef<string | null>(null);
  useEffect(() => {
    if (!den || framedDen.current === den.id || stash.length === 0) return;
    framedDen.current = den.id;
    camera.fitTo(stash, geo.snapPoints[1] ?? 0);
  }, [den, stash, camera, geo.snapPoints]);

  const markers = useStashMarkers({
    stash, focusedUser, category, selectedId, memberById, caperByPlace, onPress: onPinPress,
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
         * react-native-maps 1.27 types this prop as `showsPointsOfInterests`, but
         * the native module reads `showsPointsOfInterest`. The typed name has no
         * effect, so the native name is passed through a cast.
         */
        {...({ showsPointsOfInterest: false } as object)}
        userInterfaceStyle={isNight ? 'dark' : 'light'}
        showsCompass={false}
        showsUserLocation={Boolean(position)}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: layout.sheetPeek, left: 0 }}
        /**
         * A tap on empty map clears the selection. On iOS the map also reports
         * taps that landed on a marker, and those must not clear it.
         */
        onPress={e => { if (e.nativeEvent.action !== 'marker-press') select(null); }}
      >
        {markers}
      </MapView>

      <Grain vignette />

      {/* Apple Maps cannot be custom-styled, so a gradient behind the title keeps it legible. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.paper, colors.paper + 'D9', colors.paper + '00']}
        locations={[0, 0.55, 1]}
        style={[styles.veil, { height: geo.insets.top + 180 }]}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, geo.overMapStyle]}
      >
        <ScreenHeader
          kicker={den?.name ?? 'Ruckus'}
          title="Places"
          style={{ position: 'absolute', top: geo.insets.top + 14, left: 0, right: 0 }}
        />
        {/* Level with the day/night switch, on the other side. */}
        <View style={[styles.music, { top: geo.insets.top + 14 - 4 }]}>
          <MusicButton />
        </View>
        {/* Placed beside the title so the controls stay clear of the sheet at the half detent. */}
        <MapControls top={geo.insets.top + 70} onZoom={camera.zoom} onRecentre={() => camera.recentre({ position, points: stash, bottomInset: geo.snapPoints[detentIndex] ?? 0 })} />
      </Animated.View>

      <RascalPeek animatedPosition={animatedPosition} peekTop={geo.peekTop} halfTop={geo.halfTop} />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={geo.snapPoints}
        /** @gorhom/bottom-sheet v5 defaults to dynamic sizing, which ignores snapPoints. */
        enableDynamicSizing={false}
        /** Fixed-duration curve so the sheet lands the same way however hard it is flicked. Near-instant under Reduce Motion. */
        animationConfigs={{ duration: reduce ? 1 : motion.sheet, easing: EASE_DRAWER }}
        animatedPosition={animatedPosition}
        onChange={setDetentIndex}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={styles.handle}
        /** The shadow and blur are drawn by the background component. */
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
          * Keep this mounted at every detent. BottomSheetFlatList registers as
          * the sheet's scrollable on mount, and mounting it after the sheet has
          * moved leaves the sheet without one.
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
          {/* Search accepts touches at the full detent only. Focusing it snaps the sheet to full. */}
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
              scrollEventsHandlersHook={useListScrollLock}
              /** The list needs a bounded height to scroll and to pass drags back to the sheet. */
              style={styles.listFlex}
              onLayout={e => setListHeight(e.nativeEvent.layout.height)}
              /** Below full height the list gets room under the last row, so any selected row can reach the top. */
              contentContainerStyle={{ paddingBottom: geo.listPaddingBottom + (detentIndex < 2 ? listHeight : 0) }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={keyboardDismissMode}
              renderItem={({ item }) => (
                <PlaceRow
                  item={item}
                  savedBy={memberById.get(item.savedBy)}
                  selected={selectedId === item.id}
                  caper={caperByPlace.get(item.placeId)}
                  onPress={() => onRowPress(item)}
                />
              )}
              ListFooterComponent={
                <View style={styles.footer}>
                  <RascalSleep />
                  <Hint>{lines.hint.endOfStash}</Hint>
                </View>
              }
            />
          )}
        </View>
      </BottomSheet>

      {/* Add button. Anchored to the screen so it stays in one position at every detent. */}
      <View style={styles.addFab} pointerEvents="box-none">
        <RoundButton size={64} tone="flare" onPress={() => openOverlay({ kind: 'add' })} accessibilityLabel="Add a place">
          <IconPlus size={28} color={colors.onFlare} />
        </RoundButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mapLand },
  handle: { backgroundColor: colors.hairline, width: 44, height: 5 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
  music: { position: 'absolute', right: space.lg },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: 2,
  },
  headline: { ...type.displaySm, fontSize: 28, lineHeight: 33, color: colors.ink, marginTop: 6 },
  chipRow: { height: 62, justifyContent: 'center' },
  /** Occupies the chip row's position while the sheet is at peek. */
  peekHint: { position: 'absolute', left: space.xl, top: 84 },
  addFab: { position: 'absolute', right: space.xl, bottom: space.xl, zIndex: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginTop: 4 },
  content: { flex: 1 },
  listFlex: { flex: 1 },
  centre: { padding: space.xl, alignItems: 'center', gap: space.sm },
  error: { ...type.bodyMed, color: colors.inkSecondary, textAlign: 'center' },
  footer: { alignItems: 'center', gap: space.sm, paddingVertical: 30 },
});
