/**
 * The room — critter heads with mono labels, for the picker in onboarding
 * and for the Den on People. Never on the map (§12).
 *
 * One size, two columns, evenly spaced: the heads are the identity, so the
 * layout stays quiet (mixed sizes and scattered slots read as too much).
 * Each head bobs ±2px on its own slow sine with a phase offset — transform
 * only, cancelled on unmount, off under Reduce Motion. These are rare
 * screens, so that little ambient motion is allowed here and nowhere else.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { CritterHead } from './CritterHead';
import { Grain } from './Grain';
import { PressableScale } from './PressableScale';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, radius, space, type } from '../theme/tokens';
import { Critter } from '../types';

export interface RoomHead {
  key: string;
  critter: Critter;
  label: string;
  sub?: string;
  selected?: boolean;
}

const HEAD = 72;

export function CritterRoom({
  heads, onPick,
}: { heads: RoomHead[]; onPick?: (key: string) => void }) {
  return (
    <View style={styles.room}>
      {/* light through water — a faint band, nothing more */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.mapWater + '00', colors.mapWater + '47', colors.mapWater + '00']}
        style={styles.band}
      />
      <Grain opacity={0.04} />
      <View style={styles.grid}>
        {heads.map((h, i) => (
          <Head key={h.key} head={h} index={i} onPick={onPick} />
        ))}
      </View>
    </View>
  );
}

function Head({
  head, index, onPick,
}: { head: RoomHead; index: number; onPick?: (key: string) => void }) {
  const reduce = useReduceMotion();
  const size = HEAD;
  const bob = useSharedValue(0);
  const scale = useSharedValue(head.selected ? 1.06 : 1);

  useEffect(() => {
    if (reduce) { bob.value = 0; return; }
    const d = 1700 + index * 130;
    bob.value = withDelay(
      index * 420,
      withRepeat(
        withSequence(
          withTiming(-2, { duration: d, easing: Easing.inOut(Easing.sin) }),
          withTiming(2, { duration: d, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(bob);
  }, [reduce, index, bob]);

  useEffect(() => {
    scale.value = withTiming(head.selected ? 1.06 : 1, { duration: 200, easing: EASE_OUT });
  }, [head.selected, scale]);

  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: scale.value }],
  }));

  const inner = (
    <>
      <View style={[styles.ring, { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }, head.selected && styles.ringOn]}>
        <CritterHead critter={head.critter} size={size} />
        {head.selected ? <View style={styles.dot} /> : null}
      </View>
      <Text style={[styles.label, head.selected && { color: colors.ink }]}>{head.label.toUpperCase()}</Text>
      {head.sub ? <Text style={styles.sub}>{head.sub.toUpperCase()}</Text> : null}
    </>
  );

  return (
    <Animated.View style={[styles.slot, float]}>
      {onPick ? (
        <PressableScale
          onPress={() => onPick(head.key)}
          scaleTo={0.94}
          haptic="selection"
          accessibilityRole="radio"
          accessibilityLabel={head.label}
          accessibilityState={{ selected: !!head.selected }}
          style={styles.pick}
        >
          {inner}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={`${head.label}${head.sub ? `, ${head.sub}` : ''}`} style={styles.pick}>
          {inner}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  room: {
    borderRadius: radius.xl + 4, overflow: 'hidden', backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  band: { position: 'absolute', left: -40, right: -40, top: '30%', height: '46%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space.sm },
  slot: { width: '50%', paddingVertical: 14 },
  pick: { alignItems: 'center', gap: 6 },
  ring: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  ringOn: { borderColor: colors.flare },
  dot: {
    position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.flare, borderWidth: 2, borderColor: colors.paper,
  },
  label: { ...type.kicker, color: colors.inkSecondary },
  sub: { ...type.kicker, fontSize: 11.5, letterSpacing: 1, color: colors.inkMuted, marginTop: -2 },
});
