/**
 * Map pin. Category is the glyph inside. State is size and fill.
 * Nothing depends on colour alone. Only the selected pin uses flare and a
 * shadow.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
  /** Shows a dot at the top right when the place is already in a Caper. */
  inCaper?: boolean;
  /** Set only when the sheet is filtered to one person. */
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
  /** The deep flare, because the pale one reads as cream against the map. */
  const fill = selected ? colors.flareDeep : colors.pin;
  const glyph = selected ? colors.onFlare : colors.pinInk;
  const g = w * 0.55;

  return (
    <View style={[styles.hit, { width: w + 16, height: h + 16 }]}>
      <View style={selected ? shadow.control : undefined}>
        <Svg width={w} height={h} viewBox="0 0 40 52">
          <Path
            d="M20 1.5a18.5 18.5 0 0 1 9.6 34.3L20 49 10.4 35.8A18.5 18.5 0 0 1 20 1.5Z"
            fill={fill} stroke={glyph} strokeWidth={3} strokeLinejoin="round"
          />
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
  /** The hit target stays at least 48 at every rendered size, for accessibility. */
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
    backgroundColor: colors.butter,
    borderWidth: 2, borderColor: colors.pinInk,
  },
  critter: { position: 'absolute', left: -14, top: -20 },
});
