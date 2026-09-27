/**
 * The one pane of glass — the Places sheet's background, and nothing else.
 *
 * Paper at 72% over a blur, so the map ghosts through at every detent: §4's
 * "the map never fully dies", done as material instead of a sliver. A 1px
 * rim on the top edge makes it read as a pane rather than a scrim; a soft
 * inner depth at the bottom and a breath of grain make it read as paper.
 *
 * Nothing in here animates. gorhom moves the container's transform; blur
 * radius and overlay opacity are constant, which is what keeps the drag
 * cheap. Reduce Transparency swaps the whole thing for opaque paper.
 *
 * expo-blur note (SDK 57 docs): the blur does not update if the BlurView
 * renders before dynamic content — here it is a sibling rendered after the
 * MapView, so that caveat does not apply. borderRadius needs overflow hidden.
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
            <BlurView intensity={glass.intensity} tint="light" style={StyleSheet.absoluteFill} />
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
  /** The shadow belongs out here; the radius needs its own clipping view. */
  outer: { backgroundColor: 'transparent', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  clip: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  rim: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.rim },
  depth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
});
