/**
 * Grain overlay: a repeating 220px noise tile multiplied over the content
 * below at low opacity. It is a static image, so it has no per-frame cost.
 * It does not receive touches.
 */
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';

const grain = require('../../assets/textures/grain-220.png');

export function Grain({
  opacity = 0.05, vignette = false,
}: { opacity?: number; vignette?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ImageBackground
        source={grain}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity, mixBlendMode: 'multiply' }]}
      />
      {vignette ? (
        <>
          <LinearGradient
            colors={[colors.vignette + '14', colors.vignette + '00']}
            style={[styles.edge, { top: 0 }]}
          />
          <LinearGradient
            colors={[colors.vignette + '00', colors.vignette + '14']}
            style={[styles.edge, { bottom: 0 }]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** expo-linear-gradient has no radial gradient, so the vignette is a top and a bottom edge. */
  edge: { position: 'absolute', left: 0, right: 0, height: 120 },
});
