/**
 * Film grain — the tank pass.
 *
 * A 220px noise tile at a few percent, multiplied over whatever sits under
 * it, so the map reads as a place rather than a diagram and the sheet reads
 * as paper. A static image, never a filter: it costs one texture and nothing
 * per frame. Touches pass straight through.
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
            colors={[colors.ink + '14', colors.ink + '00']}
            style={[styles.edge, { top: 0 }]}
          />
          <LinearGradient
            colors={[colors.ink + '00', colors.ink + '14']}
            style={[styles.edge, { bottom: 0 }]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** expo-linear-gradient has no radial; two soft edges read the same at map scale. */
  edge: { position: 'absolute', left: 0, right: 0, height: 120 },
});
