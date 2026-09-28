/**
 * Small shared pieces: kickers, hints, screen headers, the sort control,
 * text fields and round buttons.
 */
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, edge, radius, shadow, space, type } from '../theme/tokens';
import { ClockPill } from './ClockPill';
import { IconCalendar, IconNav } from './Icons';
import { Sort } from '../types';

/** Dragging the list dismisses the keyboard. Android has no interactive mode, so it uses on-drag. */
export const keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

export function Kicker({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.kicker, style]}>{children.toUpperCase()}</Text>;
}

/** Muted mono helper text. Keep the font size at 13 or above. */
export function Hint({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.hint, style]}>{children}</Text>;
}

export function ScreenHeader({
  kicker, title, style,
}: { kicker: string; title: string; style?: ViewStyle }) {
  return (
    <View style={[styles.header, style]}>
      <ClockPill />
      <Kicker>{kicker}</Kicker>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

/** Switches the list between distance and date order. CLAUDE.md §4: the calendar is a sort order. */
export function SortToggle({ value, onChange }: { value: Sort; onChange: (v: Sort) => void }) {
  return (
    <View style={styles.seg}>
      {(['nearby', 'date'] as const).map(k => {
        const on = value === k;
        return (
          <PressableScale
            key={k}
            onPress={() => onChange(k)}
            haptic="selection"
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, on && styles.segItemOn]}
          >
            {k === 'nearby'
              ? <IconNav size={16} color={on ? colors.ink : colors.inkMuted} />
              : <IconCalendar size={16} color={on ? colors.ink : colors.inkMuted} />}
            <Text style={[styles.segLabel, on && { color: colors.ink }]}>
              {k === 'nearby' ? 'Nearby' : 'Date'}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Field({
  label, value, onChangeText, placeholder, ...input
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }
  & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'autoFocus' | 'maxLength'>) {
  return (
    <View>
      <Kicker>{label}</Kicker>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="done"
        blurOnSubmit
        style={styles.field}
        {...input}
      />
    </View>
  );
}

export function RoundButton({
  children, onPress, size = 52, tone = 'paper', accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  size?: number;
  tone?: 'paper' | 'flare';
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic={tone === 'flare' ? 'impact' : 'selection'}
      style={[
        {
          width: size, height: size,
          borderRadius: tone === 'flare' ? size / 2 : radius.lg,
          backgroundColor: tone === 'flare' ? colors.flare : colors.paper,
          alignItems: 'center', justifyContent: 'center',
        },
        tone === 'paper' ? shadow.control : edge(colors.flareDeep),
      ]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  kicker: { ...type.kicker, color: colors.inkMuted },
  hint: { ...type.hint, color: colors.inkMuted },
  header: { paddingHorizontal: space.xl },
  title: { ...type.display, fontSize: 40, lineHeight: 46, color: colors.ink, marginTop: 6 },
  seg: {
    flexDirection: 'row', backgroundColor: colors.paperSunk,
    borderRadius: radius.pill, padding: 4,
  },
  segItem: {
    height: 38, paddingHorizontal: 13, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  segItemOn: { backgroundColor: colors.paper, ...shadow.control, shadowRadius: 3 },
  segLabel: { fontFamily: type.chip.fontFamily, fontSize: 14, color: colors.inkMuted },
  field: {
    height: 56, borderRadius: radius.lg, marginTop: 9,
    backgroundColor: colors.paper,
    borderWidth: 1.5, borderColor: colors.hairline,
    paddingHorizontal: space.lg,
    fontFamily: type.bodyMed.fontFamily, fontSize: 16, color: colors.ink,
  },
});
