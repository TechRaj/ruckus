/**
 * Clock pill shown at the top of every tab: time, date, and a sun or moon
 * that follows the day/night palette in theme/clock.ts. Display only.
 * The time uses tabular digits so the date does not shift when it changes.
 */
import { StyleSheet, Text, View } from 'react-native';
import { IconMoon, IconSun } from './Icons';
import { formatClock, isNightAt, useNow } from '../theme/clock';
import { colors, edge, font, radius, space } from '../theme/tokens';

export function ClockPill() {
  const now = useNow();
  const { time, meridiem, date } = formatClock(now);
  const night = isNightAt(now);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${time} ${meridiem}, ${date.replace(' · ', ', ')}`}
      style={styles.pill}
    >
      <View style={[styles.face, night && styles.faceNight]}>
        {night ? <IconMoon color="#FFF0B3" /> : <IconSun color="#7A5A12" />}
      </View>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.meridiem}>{meridiem}</Text>
      <View style={styles.rule} />
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start', height: 40, marginBottom: space.md,
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 7, paddingRight: 14, borderRadius: radius.pill,
    backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.hairline,
    ...edge(colors.hairline, 3),
  },
  face: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.butter,
    alignItems: 'center', justifyContent: 'center', marginRight: space.sm,
  },
  faceNight: { backgroundColor: '#4B4F8C' },
  time: { fontFamily: font.display, fontSize: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  meridiem: { fontFamily: font.mono, fontSize: 11, color: colors.inkMuted, marginLeft: 3, marginTop: 5 },
  rule: { width: 1.5, height: 18, backgroundColor: colors.hairline, marginHorizontal: space.sm },
  date: { fontFamily: font.mono, fontSize: 13, color: colors.inkSecondary },
});
