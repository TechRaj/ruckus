/**
 * Greeting card on Home. The sky is one of four drawings, picked by the
 * time of day and not by the theme, and the sun or moon moves across it with the clock. The hills are a
 * second copy of the drawing with the sky cut away, laid over the sun, so it
 * rises and sets behind them. Nothing here animates.
 */
import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { greetingAt, moodAt, orbAt, useNow, type Mood } from '../theme/clock';
import { colors, font, radius, space } from '../theme/tokens';

const SKY: Record<Mood, { sky: number; hills: number; text: string }> = {
  morning: {
    sky: require('../../assets/sky/sky-morning.jpg'),
    hills: require('../../assets/sky/hills-morning.png'), text: '#4A3B2E',
  },
  day: {
    sky: require('../../assets/sky/sky-day.jpg'),
    hills: require('../../assets/sky/hills-day.png'), text: '#4A3B2E',
  },
  evening: {
    sky: require('../../assets/sky/sky-evening.jpg'),
    hills: require('../../assets/sky/hills-evening.png'), text: '#4A3B2E',
  },
  night: {
    sky: require('../../assets/sky/sky-night.jpg'),
    hills: require('../../assets/sky/hills-night.png'), text: '#FFF3D1',
  },
};
/** Yellow by morning and day, orange at sunset, the moon at night. */
const ORBS: Record<Mood, number> = {
  morning: require('../../assets/sky/sun.png'),
  day: require('../../assets/sky/sun.png'),
  evening: require('../../assets/sky/sun-evening.png'),
  night: require('../../assets/sky/moon.png'),
};

const HEIGHT = 150;
const ORB = 52;
/** Width over height of the sky drawings. */
const ASPECT = 1180 / 500;
/** The hills layer starts this far down the drawing, as a fraction of its height. */
const HILLS_FROM = 260 / 500;

export function SkyCard({ name }: { name?: string }) {
  const now = useNow();
  const [width, setWidth] = useState(0);
  /** The sky follows the clock, whichever mode the theme switch is in. */
  const mood = moodAt(now);
  const tone = SKY[mood];
  const orb = orbAt(now);
  const greeting = name ? `${greetingAt(now)}, ${name}` : greetingAt(now);

  /** The drawing covers the card and is centred, so a narrow phone trims its sides. */
  const artWidth = Math.max(width, HEIGHT * ASPECT);
  const artHeight = artWidth / ASPECT;
  const art = { left: (width - artWidth) / 2, top: (HEIGHT - artHeight) / 2, width: artWidth };

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={greeting}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={styles.card}
    >
      {width > 0 ? (
        <>
          <Image source={tone.sky} style={[styles.layer, art, { height: artHeight }]} />
          <Image
            source={ORBS[mood]}
            style={[styles.layer, {
              width: ORB, height: ORB,
              left: orb.x * width - ORB / 2, top: orb.y * HEIGHT - ORB / 2,
            }]}
          />
          <Image
            source={tone.hills}
            style={[styles.layer, art, {
              top: art.top + artHeight * HILLS_FROM, height: artHeight * (1 - HILLS_FROM),
            }]}
          />
        </>
      ) : null}
      <Text style={[styles.greeting, { color: tone.text }]} numberOfLines={2}>{greeting}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: HEIGHT, marginTop: space.lg, marginHorizontal: space.xl,
    borderRadius: radius.xl + 4, overflow: 'hidden',
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paperSunk,
  },
  layer: { position: 'absolute' },
  greeting: {
    position: 'absolute', left: 18, right: 18, bottom: 12,
    fontFamily: font.display, fontSize: 24, lineHeight: 30,
  },
});
