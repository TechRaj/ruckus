/**
 * Tangerine means tappable, and nothing else — §10.3.
 *
 * Label is charcoal, not white. White on #FF6846 is 2.9:1 and fails AA;
 * charcoal is 5.5:1. It also reads more like a printed sticker and less
 * like a SaaS button, so the accessible answer is the on-brand one.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from '../theme/tokens';

export function PrimaryButton({
  label, onPress, loading, disabled, leading, style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  style?: ViewStyle;
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
        ? <ActivityIndicator color={colors.ink} />
        : (
          <View style={styles.row}>
            {leading}
            <Text style={styles.primaryLabel}>{label}</Text>
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
  label, onPress, muted,
}: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.text}>
      <Text style={[styles.textLabel, muted && { color: colors.inkMuted }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  primary: {
    backgroundColor: colors.flare,
    height: 54, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: { ...type.button, color: colors.ink },
  secondary: {
    height: 52, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.hairline,
    backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryLabel: { fontFamily: type.chip.fontFamily, fontSize: 16, color: colors.inkSecondary },
  text: { height: 48, alignItems: 'center', justifyContent: 'center' },
  textLabel: { fontFamily: type.chip.fontFamily, fontSize: 16, color: colors.inkSecondary },
});
