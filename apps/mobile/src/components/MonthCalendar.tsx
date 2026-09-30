/**
 * A month at a time, for picking one day. Days before `min` cannot be
 * picked. Drawn here rather than with the system picker so it matches the
 * rest of the app and needs no native code.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconChevronLeft, IconChevronRight } from './Icons';
import { PressableScale } from './PressableScale';
import { fromIsoDay, isoDay } from '../lib/time';
import { colors, edge, font, radius, space, type } from '../theme/tokens';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  value, onChange, min = isoDay(new Date()),
}: { value: string | null; onChange: (day: string) => void; min?: string }) {
  const start = fromIsoDay(value ?? min);
  const [shown, setShown] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const today = isoDay(new Date());

  const first = new Date(shown.year, shown.month, 1);
  const count = new Date(shown.year, shown.month + 1, 0).getDate();
  /** Blank cells before the 1st, then the days, then blanks to fill the last row. */
  const cells: (number | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const move = (by: number) => {
    const d = new Date(shown.year, shown.month + by, 1);
    setShown({ year: d.getFullYear(), month: d.getMonth() });
  };
  /** No going back past the month `min` is in. */
  const minMonth = fromIsoDay(min);
  const canGoBack = shown.year > minMonth.getFullYear()
    || (shown.year === minMonth.getFullYear() && shown.month > minMonth.getMonth());

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <PressableScale onPress={() => move(-1)} disabled={!canGoBack} haptic="selection" style={[styles.arrow, !canGoBack && { opacity: 0.3 }]} accessibilityLabel="Previous month">
          <IconChevronLeft size={20} color={colors.ink} />
        </PressableScale>
        <Text style={styles.month}>{MONTHS[shown.month]} {shown.year}</Text>
        <PressableScale onPress={() => move(1)} haptic="selection" style={styles.arrow} accessibilityLabel="Next month">
          <IconChevronRight size={20} color={colors.ink} />
        </PressableScale>
      </View>
      <View style={styles.row}>
        {DAYS.map((d, i) => <Text key={i} style={styles.dayName}>{d}</Text>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const iso = isoDay(new Date(shown.year, shown.month, day));
            const past = iso < min;
            const on = iso === value;
            return (
              <PressableScale
                key={i}
                onPress={() => onChange(iso)}
                disabled={past}
                haptic="selection"
                scaleTo={0.9}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: past }}
                accessibilityLabel={iso}
                style={[styles.cell, on && styles.cellOn, iso === today && !on && styles.cellToday]}
              >
                <Text style={[styles.num, past && styles.numPast, on && styles.numOn]}>{day}</Text>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper, padding: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  month: { ...type.chip, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row' },
  dayName: { flex: 1, textAlign: 'center', ...type.meta, fontSize: 12, color: colors.inkMuted, paddingVertical: 4 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, margin: 1 },
  cellOn: { backgroundColor: colors.flare, ...edge(colors.flareDeep, 2) },
  cellToday: { borderWidth: 1.5, borderColor: colors.hairline },
  num: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  numPast: { color: colors.hairline },
  numOn: { color: colors.onFlare },
});
