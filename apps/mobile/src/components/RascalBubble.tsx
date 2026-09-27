/**
 * Rascal's bubble — the tank pass.
 *
 * One irregular blob, glass-ish paper, mono text. Rascal only: chips and
 * buttons keep their pills, and the shape difference is the difference
 * between a voice and a control.
 *
 * The blob is an SVG path stretched to the measured text, not a 9-slice
 * image — a 9-slice flattens the irregularity at every size but one, and a
 * path with a non-scaling stroke keeps the 1px rim crisp however it is
 * stretched. No blur behind it: every placement is over paper, so there is
 * nothing to blur, and the sheet stays the only pane of glass.
 *
 * Enters like everything else that appears: opacity plus a 6px rise, 180ms
 * on the strong ease-out. Nothing appears from nothing.
 */
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, shadow, type } from '../theme/tokens';

/** Drawn in a 100×60 box; preserveAspectRatio="none" stretches it to the text. */
const BLOB = 'M12 8C30 -2 72 -2 90 8C102 14 102 44 90 52C72 62 30 62 12 52C-2 44 -2 14 12 8Z';
const TAIL_LEFT = 'M14 52L10 62L26 54Z';
const TAIL_RIGHT = 'M86 52L90 62L74 54Z';

export function RascalBubble({
  children, tail = 'left', delay = 0, maxWidth = 250,
}: {
  children: string;
  tail?: 'left' | 'right';
  /** Milliseconds before it appears — a second line lands +60ms after the first. */
  delay?: number;
  maxWidth?: number;
}) {
  const reduce = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const opacity = useSharedValue(0);
  const rise = useSharedValue(reduce ? 0 : 6);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 180, easing: EASE_OUT }));
    rise.value = withDelay(delay, withTiming(0, { duration: 180, easing: EASE_OUT }));
  }, [delay, opacity, rise]);

  const enter = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Rascal says: ${children}`}
      style={[styles.wrap, { maxWidth }, shadow.control, enter]}
    >
      {size.w > 0 ? (
        <Svg
          pointerEvents="none"
          style={styles.blob}
          width={size.w}
          height={size.h + 10}
          viewBox="0 0 100 62"
          preserveAspectRatio="none"
        >
          <Path d={BLOB} fill={colors.paper} />
          <Path d={tail === 'left' ? TAIL_LEFT : TAIL_RIGHT} fill={colors.paper} />
          <Path
            d={BLOB}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.65}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      ) : null}
      <Text onLayout={onLayout} style={styles.text}>{children}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', overflow: 'visible' },
  blob: { position: 'absolute', top: 0, left: 0 },
  text: {
    ...type.mascot, color: colors.ink,
    paddingVertical: 14, paddingHorizontal: 20,
  },
});
