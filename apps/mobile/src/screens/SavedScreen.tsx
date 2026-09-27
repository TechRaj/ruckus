/**
 * The save moment — §13.3. The one place Rascal celebrates, and where the
 * "add another" loop closes.
 *
 * Staging from the tank pass: the display title sits behind Rascal, and he
 * overlaps its lower third, the way the tank's residents stand in front of
 * the studio's name. This is the only rare screen in the app, so it is the
 * only place the delight budget is spent — and the only spring.
 */
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Grain } from '../components/Grain';
import { RascalBubble } from '../components/RascalBubble';
import { SheetModal } from '../components/SheetModal';
import { RASCAL_ASPECT, rascalCheer } from '../theme/critters';
import { lines } from '../theme/lines';
import { EASE_OUT, tapSuccess, useReduceMotion } from '../theme/motion';
import { useStash } from '../state/StashContext';
import { colors, space, type } from '../theme/tokens';

const BUBBLES = [
  { left: 40, top: 60, size: 8 },
  { left: 300, top: 30, size: 10 },
  { left: 262, top: 140, size: 7 },
];

export function SavedScreen({
  name, onClose, onAddAnother,
}: { name: string; onClose: () => void; onAddAnother: () => void }) {
  const { den } = useStash();
  const reduce = useReduceMotion();

  const scale = useSharedValue(reduce ? 1 : 0.82);
  const fade = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    /** Fires once, on the one screen in the app where Rascal celebrates. */
    tapSuccess();
    /**
     * Cheer: the one spring. bounce ≈ 0.2 — enough to read as a jump, not
     * enough to read as sloppy. The title fades up 40ms behind him so he
     * arrives first. Reduce Motion makes both a plain crossfade.
     */
    scale.value = reduce ? 1 : withSpring(1, { duration: 520, dampingRatio: 0.8 });
    fade.value = withDelay(40, withTiming(1, { duration: 220, easing: EASE_OUT }));
    if (!reduce) {
      drift.value = withRepeat(withTiming(-40, { duration: 2400, easing: Easing.linear }), -1, false);
    }
  }, [reduce, scale, fade, drift]);

  const cheer = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: fade.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const bubbleDrift = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }],
    opacity: 1 + drift.value / 40,
  }));

  return (
    <SheetModal onClose={onClose} height={0.9}>
      <Grain opacity={0.035} />
      <View style={styles.body}>
        <View style={styles.stage}>
          {/* light through water, faint, under everything */}
          <LinearGradient
            pointerEvents="none"
            colors={[colors.mapWater + '00', colors.mapWater + '5C']}
            style={styles.glow}
          />
          {BUBBLES.map((b, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[styles.bubble, b, { width: b.size, height: b.size, borderRadius: b.size / 2 }, bubbleDrift]}
            />
          ))}
          <Animated.Text style={[styles.title, titleStyle]}>In the Stash</Animated.Text>
          <Animated.View style={[styles.rascalWrap, cheer]}>
            <Image source={rascalCheer} style={styles.rascal} resizeMode="contain" />
          </Animated.View>
          <View style={styles.line}>
            <RascalBubble tail="left" delay={200} maxWidth={150}>{lines.saved}</RascalBubble>
          </View>
          <Text style={styles.sub}>
            {name} is on the map for {den?.name ?? 'your Den'}.
          </Text>
        </View>
        <PrimaryButton label="See it on the map" onPress={onClose} />
        <TextButton label="Add another" onPress={onAddAnother} />
      </View>
    </SheetModal>
  );
}

const RASCAL_W = 210;

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl },
  stage: { flex: 1 },
  glow: { position: 'absolute', left: -60, right: -60, bottom: 0, height: '46%' },
  bubble: { position: 'absolute', borderWidth: 1.5, borderColor: colors.hairline },
  title: {
    position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center',
    fontFamily: type.display.fontFamily, fontSize: 56, lineHeight: 60,
    letterSpacing: -0.45, color: colors.ink,
  },
  /** His head overlaps the title's lower third; the title is still readable above him. */
  rascalWrap: { position: 'absolute', alignSelf: 'center', top: '30%', marginTop: 46, zIndex: 2 },
  rascal: { width: RASCAL_W, height: RASCAL_W / RASCAL_ASPECT },
  line: { position: 'absolute', right: 0, top: '30%', marginTop: -78, zIndex: 3 },
  sub: {
    position: 'absolute', left: 0, right: 0, top: '30%', marginTop: 264,
    ...type.body, color: colors.inkSecondary, textAlign: 'center',
  },
});
