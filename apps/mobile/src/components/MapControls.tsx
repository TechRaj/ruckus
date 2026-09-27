/**
 * Zoom stack and recentre — squircles with a shadow and no border (§13.6).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { RoundButton } from './Chrome';
import { IconMinus, IconNav, IconPlus } from './Icons';
import { colors, shadow, space } from '../theme/tokens';

export function MapControls({
  top, onZoom, onRecentre,
}: { top: number; onZoom: (direction: 1 | -1) => void; onRecentre: () => void }) {
  return (
    <View style={[styles.controls, { top }]}>
      <View style={[styles.zoomStack, shadow.control]}>
        <Pressable style={styles.zoomBtn} onPress={() => onZoom(1)} accessibilityLabel="Zoom in">
          <IconPlus size={22} color={colors.inkSecondary} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomBtn} onPress={() => onZoom(-1)} accessibilityLabel="Zoom out">
          <IconMinus size={22} color={colors.inkSecondary} />
        </Pressable>
      </View>
      <RoundButton onPress={onRecentre} accessibilityLabel="Recentre the map">
        <IconNav size={22} color={colors.inkSecondary} />
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', right: space.lg, gap: 14, alignItems: 'flex-end' },
  zoomStack: { width: 52, borderRadius: 16, backgroundColor: colors.paper },
  zoomBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginHorizontal: 10 },
});
