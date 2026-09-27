/**
 * Map pin — §12.1, restyled in §13.6.
 *
 * A resting pin says almost nothing: it marks a location and invites a tap.
 * One silhouette for the whole map, so forty pins read as one calm system.
 * Category is the interior glyph; state is size and fill. Nothing depends on
 * colour alone.
 *
 * Selection is the only place tangerine appears on the map, and the only
 * thing that lifts.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, pin as pinTokens, shadow } from '../theme/tokens';
import { Category, Critter } from '../types';
import { CategoryGlyph } from './CategoryGlyph';
import { CritterHead } from './CritterHead';

export type PinState = 'rest' | 'selected' | 'dimmed';

export function Pin({
  category, state, inCaper, critter,
}: {
  category: Category;
  state: PinState;
  /** A tangerine dot, top right — the place is already in a Caper. */
  inCaper?: boolean;
  /** Only set when the sheet is filtered to one person — §12.2. */
  critter?: Critter;
}) {
  if (state === 'dimmed') {
    return (
      <View style={styles.hit}>
        <View style={styles.dot} />
      </View>
    );
  }

  const selected = state === 'selected';
  const w = selected ? pinTokens.selected : pinTokens.rest;
  const h = w * (52 / 40);
  const fill = selected ? colors.flare : colors.ink;
  const glyph = selected ? colors.ink : colors.paper;
  const g = w * 0.55;

  return (
    <View style={[styles.hit, { width: w + 16, height: h + 16 }]}>
      <View style={selected ? shadow.control : undefined}>
        <Svg width={w} height={h} viewBox="0 0 40 52">
          <Path d="M11 34h18l-9 18Z" fill={fill} />
          <Circle cx="20" cy="20" r="20" fill={fill} />
        </Svg>
        <View style={[styles.glyph, { top: w * 0.5 - g / 2 }]}>
          <CategoryGlyph category={category} size={g} color={glyph} />
        </View>
        {inCaper && !selected ? <View style={styles.caperDot} /> : null}
        {critter ? (
          <View style={styles.critter}>
            <CritterHead critter={critter} size={34} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Hit target stays 48 regardless of the rendered size — §12.6. */
  hit: {
    minWidth: pinTokens.hitTarget,
    minHeight: pinTokens.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dot: {
    width: pinTokens.dimmed,
    height: pinTokens.dimmed,
    borderRadius: pinTokens.dimmed / 2,
    backgroundColor: colors.pinDim,
  },
  caperDot: {
    position: 'absolute', top: 1, right: -1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.flare,
    borderWidth: 2, borderColor: colors.mapLand,
  },
  critter: { position: 'absolute', left: -14, top: -20 },
});
