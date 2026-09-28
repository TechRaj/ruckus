/**
 * Plays a sprite sheet. A clipping view the size of one frame holds the whole
 * sheet, and the sheet is moved so the current frame shows through. The frame
 * is chosen on the UI thread from one looping clock, so it keeps time when
 * the JS thread is busy. Pass `frame` to hold one frame, or `loop={false}`
 * to play once and stop on the last step. Reduce Motion shows a still frame.
 */
import { useEffect, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../theme/motion';
import { SpriteSheet } from '../theme/sprites';

export function Sprite({
  sheet, width, style, accessibilityLabel, steps, loop = true, frame,
}: {
  sheet: SpriteSheet;
  /** Plays these steps in place of the sheet's own. */
  steps?: SpriteSheet['steps'];
  /** False plays the steps once and holds the last one. */
  loop?: boolean;
  /** Holds this frame and plays nothing. */
  frame?: number;
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
    const playing = steps ?? sheet.steps;
    let at = 0;
    const cumulative = playing.map(([, ms]) => (at += ms));
    return {
      scale: s, frameW: width, frameH: artH * s,
      frames: playing.map(([f]) => f),
      ends: cumulative, total: at,
    };
  }, [sheet, steps, width]);

  const still = reduce || frame !== undefined;
  /** A sprite that plays once rests where it ends. A looping one rests on the sheet's rest frame. */
  const rest = frame ?? (loop ? sheet.rest : frames[frames.length - 1]);

  useEffect(() => {
    if (still) { cancelAnimation(clock); clock.value = 0; return; }
    clock.value = 0;
    const once = withTiming(total, { duration: total, easing: Easing.linear });
    clock.value = loop ? withRepeat(once, -1, false) : once;
    return () => cancelAnimation(clock);
  }, [still, loop, total, clock]);

  const { columns, cell, padding } = sheet;
  const move = useAnimatedStyle(() => {
    let shown = rest;
    if (!still) {
      shown = frames[frames.length - 1];
      for (let i = 0; i < ends.length; i++) {
        if (clock.value < ends[i]) { shown = frames[i]; break; }
      }
    }
    const index = shown - 1;
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
