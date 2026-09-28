/**
 * Critter picker for onboarding. A large preview of the chosen critter sits
 * above a row of all the choices, so every option is visible at once.
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CritterHead } from './CritterHead';
import { PressableScale } from './PressableScale';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, edge, radius, space, type } from '../theme/tokens';
import { Critter } from '../types';

const PREVIEW = 124;

export function CritterPicker({
  critters, value, onChange,
}: {
  critters: readonly Critter[];
  value: Critter;
  onChange: (critter: Critter) => void;
}) {
  const reduce = useReduceMotion();
  return (
    <View>
      <View style={styles.preview}>
        {/* Keyed by critter so each new choice fades in. */}
        <Animated.View key={value} entering={reduce ? undefined : FadeIn.duration(180).easing(EASE_OUT)}>
          <CritterHead critter={value} size={PREVIEW} />
        </Animated.View>
      </View>
      <Text style={styles.name} accessibilityLiveRegion="polite">{value}</Text>
      <View style={styles.strip} accessibilityRole="radiogroup">
        {critters.map(c => {
          const on = c === value;
          return (
            <PressableScale
              key={c}
              onPress={() => onChange(c)}
              scaleTo={0.95}
              haptic="selection"
              accessibilityRole="radio"
              accessibilityLabel={c}
              accessibilityState={{ selected: on }}
              style={[styles.thumb, on && styles.thumbOn]}
            >
              <CritterHead critter={c} size={52} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 164, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paperSunk, borderWidth: 1.5, borderColor: colors.hairline,
  },
  name: {
    ...type.displaySm, color: colors.ink, textAlign: 'center',
    textTransform: 'capitalize', marginTop: space.sm,
  },
  strip: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  /** Square tiles that share the row equally, so four or eight fit the same way. */
  thumb: {
    flex: 1, aspectRatio: 1, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.hairline,
  },
  thumbOn: { backgroundColor: colors.flareWash, borderColor: colors.flareDeep, ...edge(colors.flareDeep, 3) },
});
