/**
 * Pressable that scales down while pressed. Use it for every pressable in
 * the app. Reduce Motion turns the scale off and keeps the haptic and the
 * sound.
 */
import { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { motion } from '../theme/tokens';
import { EASE_OUT, tapImpact, tapSelection, useReduceMotion } from '../theme/motion';
import { playTap } from '../theme/sound';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children, onPress, style, scaleTo = 0.97, haptic = 'none', sound, disabled, ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** Use `selection` for choosing, `impact` for committing, `none` for navigation. */
  haptic?: 'none' | 'selection' | 'impact';
  /** Every press makes the tap sound unless this is `none`. */
  sound?: 'none' | 'tap';
}) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = useCallback(() => {
    if (haptic === 'selection') tapSelection();
    if (haptic === 'impact') tapImpact();
    if (sound !== 'none') playTap();
    onPress?.(undefined as never);
  }, [haptic, sound, onPress]);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={() => {
        if (!reduce && !disabled) {
          scale.value = withTiming(scaleTo, { duration: motion.press, easing: EASE_OUT });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.pressOut, easing: EASE_OUT });
      }}
      onPress={press}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
