/**
 * Loading state shown while a shared link resolves. The percentage counts to
 * 92 and holds there until the result arrives. It is drawn with an animated
 * TextInput so it updates on the UI thread without a React render per frame.
 * Reduce Motion keeps the number and moves the bar in 25% steps.
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

/** The mock resolve takes about 900ms. The count reaches 92 in that time. */
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
      <Hint>nothing is saved until you confirm.</Hint>
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
  track: { height: 10, borderRadius: 5, backgroundColor: colors.paperSunk, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.flare },
});
