/**
 * Speech bubble for Rascal's lines. The blob is an SVG path stretched to the
 * measured text size. The outline uses a non-scaling stroke so it keeps its
 * width when the path is stretched.
 */
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, shadow, type } from '../theme/tokens';

/** Drawn in a 100×60 box. preserveAspectRatio="none" stretches it to the text. */
const BLOB = 'M12 8C30 -2 72 -2 90 8C102 14 102 44 90 52C72 62 30 62 12 52C-2 44 -2 14 12 8Z';
const TAIL_LEFT = 'M14 52L10 62L26 54Z';
const TAIL_RIGHT = 'M86 52L90 62L74 54Z';

export function RascalBubble({
  children, tail = 'left', delay = 0, maxWidth = 250,
}: {
  children: string;
  tail?: 'left' | 'right';
  /** Milliseconds before the bubble appears. */
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
            stroke={colors.hairline}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      ) : null}
      <Text onLayout={onLayout} style={styles.text}>{children}</Text>
      <View style={styles.tag}><Text style={styles.tagLabel}>Rascal</Text></View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', overflow: 'visible' },
  blob: { position: 'absolute', top: 0, left: 0 },
  tag: {
    position: 'absolute', top: -11, left: 14, paddingHorizontal: 12, paddingVertical: 1,
    borderRadius: 999, backgroundColor: colors.peach, transform: [{ rotate: '-4deg' }],
  },
  tagLabel: { ...type.chip, fontSize: 13, color: '#5B3A2C' },
  text: {
    ...type.mascot, color: colors.ink,
    paddingVertical: 14, paddingHorizontal: 20,
  },
});
