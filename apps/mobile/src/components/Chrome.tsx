/**
 * The small shared pieces: kickers, screen headers, the sort control, fields.
 * §13.6 — a letterspaced uppercase kicker naming the Den, then the screen
 * name in display type, sitting straight over the map.
 */
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, radius, shadow, space, type } from '../theme/tokens';
import { IconCalendar, IconNav } from './Icons';
import { Sort } from '../types';

/** Drag the keyboard down to dismiss it. iOS follows the finger; Android dismisses on drag. */
export const keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

export function Kicker({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.kicker, style]}>{children.toUpperCase()}</Text>;
}

/** A lowercase mono aside — "pull up for the list". Muted, never smaller than 13. */
export function Hint({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.hint, style]}>{children}</Text>;
}

export function ScreenHeader({
  kicker, title, style,
}: { kicker: string; title: string; style?: ViewStyle }) {
  return (
    <View style={[styles.header, style]}>
      <Kicker>{kicker}</Kicker>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

/** Calendar is a sort order, not a tab — §4 and §7. */
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
        tone === 'paper' && shadow.control,
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
    borderRadius: 14, padding: 4,
  },
  segItem: {
    height: 38, paddingHorizontal: 13, borderRadius: 11,
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
