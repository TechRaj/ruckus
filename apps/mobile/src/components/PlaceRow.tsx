/**
 * A Stash list row: name, neighbourhood and distance, then the saved note.
 * The leading tile shows the same glyph as the map pin. The trailing critter
 * is the member who saved the place.
 */
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { dayLabel, dotted } from '../lib/time';
import { colors, font, radius, space, type } from '../theme/tokens';
import { Caper, Member, StashItem } from '../types';
import { CategoryGlyph } from './CategoryGlyph';
import { CritterHead } from './CritterHead';

export const ROW_HEIGHT = 84;

export function PlaceRow({
  item, savedBy, selected, caper, onPress,
}: {
  item: StashItem;
  savedBy: Member | undefined;
  selected: boolean;
  /** Set when the place has an upcoming Caper. Its day leads the second line. */
  caper?: Caper;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      /** A full-width row uses a smaller scale change than a button. At 0.97 the whole row visibly shifts. */
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[item.name, item.neighbourhood, item.distance].filter(Boolean).join(', ')}
      style={[styles.row, selected && styles.rowOn]}
    >
      <View style={styles.tile}>
        <CategoryGlyph category={item.category} size={25} color={colors.ink} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {caper ? <Text style={styles.when}>{dotted(dayLabel(caper.date), caper.time)} · </Text> : null}
          {dotted(item.neighbourhood, item.distance)}
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
  /** The margin and padding swap equal amounts, so the content does not move when the row is selected. */
  rowOn: {
    backgroundColor: colors.flareWash,
    borderBottomColor: 'transparent',
    borderRadius: radius.xl,
    marginHorizontal: space.md, paddingHorizontal: space.md,
  },
  tile: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.paperSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  name: { ...type.rowTitle, color: colors.ink },
  meta: { ...type.meta, color: colors.inkMuted, marginTop: 1 },
  when: { fontFamily: font.bold, color: colors.ink },
  note: { ...type.bodyMed, fontSize: 14, color: colors.inkSecondary, marginTop: 2 },
});
