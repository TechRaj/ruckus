/**
 * Primary, secondary and text buttons. The flare colour is reserved for
 * tappable things. Labels on flare use `onFlare`, because `ink` turns cream
 * at night and loses contrast.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, edge, radius, space, type } from '../theme/tokens';

export function PrimaryButton({
  label, onPress, loading, disabled, leading, style, labelColor,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  style?: ViewStyle;
  /** Label colour override, for when the fill is not flare. */
  labelColor?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic="impact"
      accessibilityRole="button"
      style={[styles.primary, (disabled || loading) && { opacity: 0.55 }, style]}
    >
      {loading
        ? <ActivityIndicator color={colors.onFlare} />
        : (
          <View style={styles.row}>
            {leading}
            <Text style={[styles.primaryLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
          </View>
        )}
    </PressableScale>
  );
}

export function SecondaryButton({
  label, onPress, leading,
}: { label: string; onPress: () => void; leading?: React.ReactNode }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.secondary}>
      <View style={styles.row}>
        {leading}
        <Text style={styles.secondaryLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

export function TextButton({
  label, onPress, muted, danger,
}: { label: string; onPress: () => void; muted?: boolean; danger?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.text}>
      <Text style={[styles.textLabel, muted && { color: colors.inkMuted }, danger && { color: colors.warn }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  primary: {
    backgroundColor: colors.flare,
    height: 54, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    ...edge(colors.flareDeep),
  },
  primaryLabel: { ...type.button, color: colors.onFlare },
  secondary: {
    height: 52, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.hairline,
    backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
    ...edge(colors.hairline, 4),
  },
  secondaryLabel: { fontFamily: type.chip.fontFamily, fontSize: 16, color: colors.inkSecondary },
  text: { height: 48, alignItems: 'center', justifyContent: 'center' },
  textLabel: { fontFamily: type.chip.fontFamily, fontSize: 16, color: colors.inkSecondary },
});
