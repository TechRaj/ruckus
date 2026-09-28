/**
 * Day and night switch, at the top of every tab. Moon on the left, sun on
 * the right. Tapping it saves the choice and reloads the app into the other
 * palette, because styles read `colors` when the app loads. The knob moves
 * first so the tap is answered before the reload.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { USE_MOCKS } from '../api/client';
import { IconMoon, IconSun } from './Icons';
import { PressableScale } from './PressableScale';
import { switchMode } from '../theme/clock';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, edge, isNight, radius, space } from '../theme/tokens';

const SEGMENT = 44;
const SLIDE_MS = 200;

export function ThemeSwitch() {
  const reduce = useReduceMotion();
  /** 0 is the moon side, 1 is the sun side. */
  const side = useSharedValue(isNight ? 0 : 1);

  useEffect(() => { side.value = isNight ? 0 : 1; }, [side]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: side.value * SEGMENT }] }));

  const toggle = () => {
    /** The mock forgets its session on reload, so it stays in day mode. */
    if (USE_MOCKS) return;
    side.value = withTiming(isNight ? 1 : 0, { duration: reduce ? 1 : SLIDE_MS, easing: EASE_OUT });
    switchMode(isNight ? 'day' : 'night', reduce ? 0 : SLIDE_MS + 40);
  };

  return (
    <PressableScale
      onPress={toggle}
      haptic="selection"
      scaleTo={0.96}
      accessibilityRole="switch"
      accessibilityLabel="Night mode"
      accessibilityState={{ checked: isNight }}
      style={styles.track}
    >
      <Animated.View style={[styles.knob, knob]} />
      <View style={styles.segment}>
        <IconMoon size={17} color={isNight ? colors.onFlare : colors.inkMuted} />
      </View>
      <View style={styles.segment}>
        <IconSun size={17} color={isNight ? colors.inkMuted : colors.onFlare} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'flex-start', flexDirection: 'row', marginBottom: space.md,
    padding: 4, borderRadius: radius.pill,
    backgroundColor: colors.paperSunk, borderWidth: 1.5, borderColor: colors.hairline,
    ...edge(colors.hairline, 3),
  },
  segment: { width: SEGMENT, height: 32, alignItems: 'center', justifyContent: 'center' },
  knob: {
    position: 'absolute', top: 4, left: 4, width: SEGMENT, height: 32,
    borderRadius: radius.pill, backgroundColor: colors.flare,
    ...edge(colors.flareDeep, 2),
  },
});
