/**
 * The one loading state — Rascal sniffing, with a number.
 *
 * The tank makes you watch water fill and read a percentage before it lets
 * you in. Ruckus never gates, but its one wait gets the same care: a
 * tabular count that climbs to 92 and holds until the answer lands. The number runs on the UI thread through an animated
 * TextInput so it ticks without a render per frame. Reduce Motion keeps
 * the number (it is information) and snaps the bar.
 */
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Hint } from './Chrome';
import { RascalBubble } from './RascalBubble';
import { RASCAL_ASPECT, rascalSniff } from '../theme/critters';
import { pickSniffLine } from '../theme/lines';
import { useReduceMotion } from '../theme/motion';
import { colors, space, type } from '../theme/tokens';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/** The mock resolve takes ~900ms; the number reaches 92 in that time and holds. */
const EXPECTED_MS = 900;

export function Sniffing({ url }: { url: string | null }) {
  const reduce = useReduceMotion();
  const pct = useSharedValue(0);
  const line = useMemo(pickSniffLine, []);

  useEffect(() => {
    pct.value = withTiming(92, { duration: EXPECTED_MS, easing: Easing.linear });
  }, [pct]);

  const label = useAnimatedProps(() => ({
    text: `SNIFFING · ${Math.round(pct.value)}%`,
    defaultValue: `SNIFFING · ${Math.round(pct.value)}%`,
  }));
  const bar = useAnimatedStyle(() => ({
    width: `${reduce ? Math.round(pct.value / 25) * 25 : pct.value}%`,
  }));

  return (
    <View style={styles.wrap}>
      {url ? <Hint style={styles.url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</Hint> : null}
      <View style={styles.stage}>
        <Image source={rascalSniff} style={styles.rascal} resizeMode="contain" />
        <View style={styles.bubble}>
          <RascalBubble tail="left" maxWidth={180}>{line}</RascalBubble>
        </View>
      </View>
      <AnimatedInput
        editable={false}
        underlineColorAndroid="transparent"
        animatedProps={label}
        style={styles.progress}
      />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, bar]} />
      </View>
      <Hint>nothing leaves your phone until you confirm.</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.md },
  url: { color: colors.inkSecondary },
  stage: { height: 220, marginTop: space.md },
  rascal: { position: 'absolute', left: 8, top: 36, width: 180, height: 180 / RASCAL_ASPECT },
  bubble: { position: 'absolute', left: 176, top: 18 },
  progress: { ...type.progress, color: colors.inkSecondary, padding: 0, marginTop: space.md },
  track: { height: 2, borderRadius: 1, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { height: 2, borderRadius: 1, backgroundColor: colors.flare },
});
