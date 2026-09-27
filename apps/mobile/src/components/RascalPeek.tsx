/**
 * Rascal props his paws on the sheet — §13.3.
 *
 * He rides the sheet's animated position rather than a computed constant, so
 * he tracks the drag instead of jumping between detents. The render's paw line
 * sits at about 83% of its height, so anchoring that point to the sheet's top
 * edge puts the paws over the panel and the rest of him above it.
 *
 * He is on a higher layer than the sheet on purpose: behind it, the paws are
 * the part that gets hidden, which is the whole gesture.
 *
 * Peek only. An accent, never a passenger.
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
    /** Fades out as the sheet leaves peek — he would cover the list otherwise. */
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
