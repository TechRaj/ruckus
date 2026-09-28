/**
 * Loading state shown while a shared link resolves. The percentage counts to
 * 92 and holds there until the result arrives. It is drawn with an animated
 * TextInput so it updates on the UI thread without a React render per frame.
 * Reduce Motion keeps the number and moves the bar in 25% steps. Rascal
 * hangs from the progress bar by his paws.
 */
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Hint } from './Chrome';
import { RascalBubble } from './RascalBubble';
import { rascalHang } from '../theme/critters';
import { pickSniffLine } from '../theme/lines';
import { useReduceMotion } from '../theme/motion';
import { colors, space, type } from '../theme/tokens';

const WIDTH = 168;
const HEIGHT = WIDTH / rascalHang.aspect;
const STAGE = 176;

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
      <View>
        <View style={styles.stage}>
          <View style={styles.bubble}>
            <RascalBubble tail="right" maxWidth={180}>{line}</RascalBubble>
          </View>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        {/* After the bar, so his claws are drawn over it. */}
        <Image source={rascalHang.source} style={styles.rascal} resizeMode="contain" />
      </View>
      <AnimatedInput
        editable={false}
        underlineColorAndroid="transparent"
        animatedProps={label}
        style={styles.progress}
      />
      <Hint>nothing is saved until you confirm.</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.md },
  url: { color: colors.inkSecondary },
  stage: { height: STAGE, marginTop: space.md },
  /** His paw line sits on the top edge of the bar, which is the bottom of the stage. */
  rascal: {
    position: 'absolute', right: space.md, top: space.md + STAGE - HEIGHT * rascalHang.pawLine,
    width: WIDTH, height: HEIGHT,
  },
  bubble: { position: 'absolute', left: 0, top: 22 },
  progress: { ...type.progress, color: colors.inkSecondary, padding: 0 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.paperSunk, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.flare },
});
