/**
 * Grid of critter heads with labels, used by the onboarding picker and the
 * Den on People. Two columns by default, four per row when `compact`.
 * Each head bobs 2px unless Reduce Motion is on. The labels stay still so
 * the row keeps one baseline.
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
  /** false leaves this head inert when the room is pickable, e.g. your own. */
  pickable?: boolean;
}

const HEAD = 72;
const HEAD_COMPACT = 56;

export function CritterRoom({
  heads, onPick, compact = false, pickRole = 'radio', pickHint,
}: {
  heads: RoomHead[]; onPick?: (key: string) => void; compact?: boolean;
  /** 'radio' for choosing one (onboarding), 'button' when a tap opens something. */
  pickRole?: 'radio' | 'button'; pickHint?: string;
}) {
  return (
    <View style={styles.room}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.mapWater + '00', colors.mapWater + '2E', colors.mapWater + '00']}
        style={styles.band}
      />
      <Grain opacity={0.04} />
      <View style={styles.grid}>
        {heads.map((h, i) => (
          <Head key={h.key} head={h} index={i} onPick={h.pickable === false ? undefined : onPick} compact={compact} role={pickRole} hint={pickHint} />
        ))}
      </View>
    </View>
  );
}

function Head({
  head, index, onPick, compact, role, hint,
}: { head: RoomHead; index: number; onPick?: (key: string) => void; compact: boolean; role: 'radio' | 'button'; hint?: string }) {
  const reduce = useReduceMotion();
  const size = compact ? HEAD_COMPACT : HEAD;
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
      <Animated.View style={[styles.ring, { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }, head.selected && styles.ringOn, float]}>
        <CritterHead critter={head.critter} size={size} />
        {head.selected ? <View style={styles.dot} /> : null}
      </Animated.View>
      <Text style={[styles.label, head.selected && { color: colors.ink }]}>{head.label.toUpperCase()}</Text>
      {head.sub ? <Text style={styles.sub}>{head.sub.toUpperCase()}</Text> : null}
    </>
  );

  return (
    <View style={[styles.slot, compact && styles.slotCompact]}>
      {onPick ? (
        <PressableScale
          onPress={() => onPick(head.key)}
          scaleTo={0.94}
          haptic="selection"
          accessibilityRole={role}
          accessibilityLabel={head.label}
          accessibilityHint={hint}
          accessibilityState={role === 'radio' ? { selected: !!head.selected } : undefined}
          style={styles.pick}
        >
          {inner}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={`${head.label}${head.sub ? `, ${head.sub}` : ''}`} style={styles.pick}>
          {inner}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    borderRadius: radius.xl + 4, overflow: 'hidden', backgroundColor: colors.paperSunk,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  band: { position: 'absolute', left: -40, right: -40, top: '30%', height: '46%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space.sm },
  slot: { width: '50%', paddingVertical: 14 },
  slotCompact: { width: '25%', paddingVertical: 10 },
  pick: { alignItems: 'center', gap: 6 },
  ring: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  ringOn: { borderColor: colors.flareDeep },
  dot: {
    position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.flare, borderWidth: 2, borderColor: colors.paper,
  },
  label: { ...type.kicker, color: colors.inkSecondary },
  sub: { ...type.kicker, fontSize: 11.5, letterSpacing: 1, color: colors.inkMuted, marginTop: -2 },
});
