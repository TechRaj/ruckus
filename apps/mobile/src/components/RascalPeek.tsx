/**
 * Rascal hanging from the top edge of the sheet at the peek detent. He
 * follows the sheet's animated position, so he tracks the drag. The image's
 * paw line is anchored to the sheet's top edge, and he renders above the
 * sheet so the claws hang over it.
 */
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle, type SharedValue,
} from 'react-native-reanimated';
import { rascalHang } from '../theme/critters';

const WIDTH = 140;
const HEIGHT = WIDTH / rascalHang.aspect;
const PAW_LINE = rascalHang.pawLine;

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
      <Image source={rascalHang.source} resizeMode="contain" style={styles.image} />
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
