/**
 * Rascal image that sits on the top edge of the sheet at the peek detent.
 * It follows the sheet's animated position so it tracks the drag. The paws
 * are at about 83% of the image height, and that line is anchored to the
 * sheet's top edge. It renders above the sheet so the paws stay visible.
 */
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle, type SharedValue,
} from 'react-native-reanimated';
import { RASCAL_ASPECT, rascal } from '../theme/critters';

const WIDTH = 112;
const HEIGHT = WIDTH / RASCAL_ASPECT;
const PAW_LINE = 0.83;

export function RascalPeek({
  animatedPosition, peekTop, halfTop,
}: {
  /** The sheet's top edge, in screen px, driven on the UI thread. */
  animatedPosition: SharedValue<number>;
  peekTop: number;
  halfTop: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - HEIGHT * PAW_LINE }],
    /** Fades out as the sheet leaves peek, so the image does not cover the list. */
    opacity: interpolate(
      animatedPosition.value,
      [halfTop, (halfTop + peekTop) / 2, peekTop],
      [0, 0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.rascal, style]}>
      <Image source={rascal} resizeMode="contain" style={styles.image} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rascal: {
    position: 'absolute',
    top: 0,
    right: 28,
    width: WIDTH,
    height: HEIGHT,
    zIndex: 5,
  },
  image: { width: WIDTH, height: HEIGHT },
});
