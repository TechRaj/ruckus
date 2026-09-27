/**
 * Every pressable in the app goes through here.
 *
 * A colour swap alone does not confirm the interface heard you — the press
 * needs to move. 0.97 is enough to feel and not enough to notice, and because
 * `scale` also scales children, labels and icons come with it for free.
 *
 * Reduce Motion drops the scale and keeps the colour and the haptic, so the
 * feedback survives without the movement (§11.3).
 */
import { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { motion } from '../theme/tokens';
import { EASE_OUT, tapImpact, tapSelection, useReduceMotion } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children, onPress, style, scaleTo = 0.97, haptic = 'none', disabled, ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** `selection` for choosing, `impact` for committing, `none` for navigation. */
  haptic?: 'none' | 'selection' | 'impact';
}) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = useCallback(() => {
    if (haptic === 'selection') tapSelection();
    if (haptic === 'impact') tapImpact();
    onPress?.(undefined as never);
  }, [haptic, onPress]);

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
