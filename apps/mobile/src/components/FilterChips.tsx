/**
 * Filter chips for the Places sheet: Everyone, Today, one chip per Den
 * member, then the categories (CLAUDE.md §4). The person filter and the
 * category filter are independent and apply together.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, edge, radius, space, type } from '../theme/tokens';
import { CATEGORIES, CATEGORY_LABEL, Category, Filter, Member } from '../types';
import { CategoryGlyph } from './CategoryGlyph';
import { CritterHead } from './CritterHead';
import { IconSparkle } from './Icons';

export function FilterChips({
  members, active, onChange, currentUserId, category, onCategory,
}: {
  members: Member[];
  active: Filter;
  onChange: (f: Filter) => void;
  currentUserId: string | null;
  category: Category | null;
  onCategory: (c: Category | null) => void;
}) {
  const others = members.filter(m => m.userId !== currentUserId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Chip
        label="Everyone"
        selected={active.kind === 'everyone'}
        onPress={() => onChange({ kind: 'everyone' })}
        leading={
          <View style={styles.stack}>
            {members.slice(0, 3).map((m, i) => (
              <View key={m.userId} style={{ marginLeft: i ? -13 : 0 }}>
                <CritterHead critter={m.critter} size={32} />
              </View>
            ))}
          </View>
        }
      />
      <Chip
        label="Today"
        selected={active.kind === 'today'}
        onPress={() => onChange(active.kind === 'today' ? { kind: 'everyone' } : { kind: 'today' })}
        leading={
          <IconSparkle
            size={19}
            color={active.kind === 'today' ? colors.onFlare : colors.inkMuted}
          />
        }
      />
      {others.map(m => {
        const on = active.kind === 'person' && active.userId === m.userId;
        return (
          <Chip
            key={m.userId}
            label={m.displayName}
            selected={on}
            onPress={() => onChange(on ? { kind: 'everyone' } : { kind: 'person', userId: m.userId })}
            leading={<CritterHead critter={m.critter} size={34} />}
          />
        );
      })}
      <View style={styles.rule} />
      {CATEGORIES.map(c => {
        const on = category === c;
        return (
          <Chip
            key={c}
            label={CATEGORY_LABEL[c]}
            selected={on}
            onPress={() => onCategory(on ? null : c)}
            leading={<CategoryGlyph category={c} size={19} color={on ? colors.onFlare : colors.inkMuted} />}
            padLeft={15}
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({
  label, selected, onPress, leading, padLeft = 8,
}: {
  label: string; selected: boolean; onPress: () => void;
  leading?: React.ReactNode; padLeft?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { paddingLeft: padLeft }, selected && styles.chipOn]}
    >
      {leading}
      <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.xl, gap: 9, alignItems: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    height: 46, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingLeft: 8, paddingRight: 18,
    borderWidth: 1.5, borderColor: colors.hairline,
    backgroundColor: colors.paper,
  },
  chipOn: { backgroundColor: colors.flare, borderColor: colors.flareDeep, ...edge(colors.flareDeep, 3) },
  rule: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.hairline, marginHorizontal: 3 },
  label: { ...type.chip, color: colors.inkSecondary },
  labelOn: { color: colors.onFlare },
});
