/**
 * Plays a sprite sheet. A clipping view the size of one frame holds the whole
 * sheet, and the sheet is moved so the current frame shows through. The frame
 * is chosen on the UI thread from one looping clock, so it keeps time when
 * the JS thread is busy. Reduce Motion shows the sheet's rest frame.
 */
import { useEffect, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../theme/motion';
import { SpriteSheet } from '../theme/sprites';

export function Sprite({
  sheet, width, style, accessibilityLabel,
}: {
  sheet: SpriteSheet;
  /** Width of one frame on screen. Height follows the frame's shape. */
  width: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const reduce = useReduceMotion();
  const clock = useSharedValue(0);

  const { scale, frameW, frameH, frames, ends, total } = useMemo(() => {
    const artW = sheet.cell.width - sheet.padding * 2;
    const artH = sheet.cell.height - sheet.padding * 2;
    const s = width / artW;
    let at = 0;
    const cumulative = sheet.steps.map(([, ms]) => (at += ms));
    return {
      scale: s, frameW: width, frameH: artH * s,
      frames: sheet.steps.map(([frame]) => frame),
      ends: cumulative, total: at,
    };
  }, [sheet, width]);

  useEffect(() => {
    if (reduce) { cancelAnimation(clock); clock.value = 0; return; }
    clock.value = 0;
    clock.value = withRepeat(withTiming(total, { duration: total, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [reduce, total, clock]);

  const { columns, cell, padding, rest } = sheet;
  const move = useAnimatedStyle(() => {
    let frame = rest;
    if (!reduce) {
      frame = frames[frames.length - 1];
      for (let i = 0; i < ends.length; i++) {
        if (clock.value < ends[i]) { frame = frames[i]; break; }
      }
    }
    const index = frame - 1;
    return {
      transform: [
        { translateX: -((index % columns) * cell.width + padding) * scale },
        { translateY: -(Math.floor(index / columns) * cell.height + padding) * scale },
      ],
    };
  });

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: frameW, height: frameH, overflow: 'hidden' }, style]}
    >
      <Animated.Image
        source={sheet.source}
        style={[{
          width: sheet.columns * cell.width * scale,
          height: sheet.rows * cell.height * scale,
        }, move]}
      />
    </View>
  );
}
