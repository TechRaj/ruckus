/**
 * Background for the Places sheet: translucent paper over a blur, so the map
 * stays visible at every detent (CLAUDE.md §4). Blur and opacity are
 * constant, which keeps the drag cheap. Reduce Transparency renders opaque
 * paper. The BlurView must render after the MapView or the blur does not
 * update.
 */
import { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Grain } from './Grain';
import { useReduceTransparency } from '../theme/motion';
import { colors, glass, radius, shadow } from '../theme/tokens';

export function GlassSheetBackground({ style, pointerEvents }: BottomSheetBackgroundProps) {
  const opaque = useReduceTransparency();
  return (
    <View pointerEvents={pointerEvents} style={[style, styles.outer, shadow.sheet]}>
      <View style={styles.clip}>
        {opaque ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]} />
        ) : (
          <>
            <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.fill }]} />
          </>
        )}
        <Grain opacity={0.035} />
        <View style={styles.rim} />
        <LinearGradient
          pointerEvents="none"
          colors={[glass.depth.replace('0.05', '0'), glass.depth]}
          style={styles.depth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** The shadow is on the outer view because overflow hidden on the inner view would clip it. */
  outer: { backgroundColor: 'transparent', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  clip: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  rim: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.rim },
  depth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
});
