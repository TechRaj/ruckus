/**
 * Sky card on Home: a greeting over a sky that changes with the time of day.
 * The sun or moon is positioned from the current time. There is no
 * animation. The position updates when the clock ticks.
 */
import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { greetingAt, moodAt, orbAt, useNow } from '../theme/clock';
import { colors, font, radius, sky, space } from '../theme/tokens';

const HEIGHT = 150;
const ORB = 44;
const STARS = [[0.18, 0.22], [0.64, 0.14], [0.82, 0.38], [0.4, 0.34]];

export function SkyCard({ name }: { name?: string }) {
  const now = useNow();
  const [width, setWidth] = useState(0);
  const mood = moodAt(now);
  const night = mood === 'night';
  const tone = sky[mood];
  const orb = orbAt(now);
  const greeting = name ? `${greetingAt(now)}, ${name}` : greetingAt(now);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={greeting}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={styles.card}
    >
      <LinearGradient colors={[tone.top, tone.bottom]} style={StyleSheet.absoluteFill} />
      {night ? STARS.map(([x, y], i) => (
        <View key={i} style={[styles.star, { left: `${x * 100}%`, top: `${y * 100}%` }]} />
      )) : null}
      <View style={[styles.cloud, night && styles.cloudNight, { left: '12%', top: '26%', width: 64 }]} />
      <View style={[styles.cloud, night && styles.cloudNight, { left: '62%', top: '40%', width: 84 }]} />
      {width > 0 ? (
        <View
          style={[styles.orb, {
            backgroundColor: tone.orb,
            left: orb.x * width - ORB / 2, top: orb.y * HEIGHT - ORB / 2,
          }]}
        />
      ) : null}
      <View style={[styles.hill, styles.hillBack, { backgroundColor: tone.hillBack }]} />
      <View style={[styles.hill, styles.hillFront, { backgroundColor: tone.hill }]} />
      <Text style={[styles.greeting, { color: tone.text }]} numberOfLines={2}>{greeting}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: HEIGHT, marginTop: space.lg, marginHorizontal: space.xl,
    borderRadius: radius.xl + 4, overflow: 'hidden',
    borderWidth: 1.5, borderColor: colors.hairline,
  },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF6D0' },
  cloud: { position: 'absolute', height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.75)' },
  cloudNight: { backgroundColor: 'rgba(255,255,255,0.12)' },
  orb: { position: 'absolute', width: ORB, height: ORB, borderRadius: ORB / 2 },
  hill: { position: 'absolute', height: 96, borderRadius: 200 },
  hillBack: { left: '34%', right: '-30%', bottom: -54 },
  hillFront: { left: '-10%', right: '30%', bottom: -50 },
  greeting: {
    position: 'absolute', left: 18, right: 18, bottom: 12,
    fontFamily: font.display, fontSize: 24, lineHeight: 30,
  },
});
