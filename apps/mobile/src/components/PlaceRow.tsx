/**
 * A Stash row — brief §12, restyled in §13.6.
 *
 * Three lines: the name, then neighbourhood and distance, then one human line
 * about why it is saved. That third line is the whole reason this is not a
 * bookmark folder, and it was missing from the first pass.
 *
 * The leading tile carries the same glyph the pin does, which is what ties the
 * list to the map. The trailing critter is who saved it.
 */
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, space, type } from '../theme/tokens';
import { Member, StashItem } from '../types';
import { CategoryGlyph } from './CategoryGlyph';
import { CritterHead } from './CritterHead';

export const ROW_HEIGHT = 84;

export function PlaceRow({
  item, savedBy, selected, onPress,
}: {
  item: StashItem;
  savedBy: Member | undefined;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      /** A full-width row needs less scale than a button, or it reads as a wobble. */
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.name}, ${item.neighbourhood}, ${item.distance}`}
      style={[styles.row, selected && styles.rowOn]}
    >
      {selected ? <View style={styles.rail} /> : null}
      <View style={styles.tile}>
        <CategoryGlyph category={item.category} size={25} color={colors.ink} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.neighbourhood} · {item.distance}
        </Text>
        <Text style={styles.note} numberOfLines={1}>{item.note}</Text>
      </View>
      {savedBy ? <CritterHead critter={savedBy.critter} size={44} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  rowOn: {
    backgroundColor: colors.flareWash,
    borderBottomColor: 'transparent',
    paddingLeft: space.lg,
  },
  rail: {
    position: 'absolute', left: 0, top: 12, bottom: 12, width: 4,
    borderTopRightRadius: 3, borderBottomRightRadius: 3,
    backgroundColor: colors.flare,
  },
  tile: {
    width: 56, height: 56, borderRadius: 17,
    backgroundColor: colors.paperSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  name: { ...type.rowTitle, color: colors.ink },
  meta: { ...type.meta, color: colors.inkMuted, marginTop: 1 },
  note: { ...type.bodyMed, fontSize: 14, color: colors.inkSecondary, marginTop: 2 },
});
