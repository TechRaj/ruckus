/** Shown after a place is saved. Offers the map or adding another place. The only screen that uses a spring animation. */
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
import { rascalStand } from '../theme/critters';
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
  name, count = 1, onClose, onAddAnother,
}: {
  name: string;
  /** How many places were saved together. `name` is the first of them. */
  count?: number;
  onClose: () => void;
  onAddAnother: () => void;
}) {
  const { den } = useStash();
  const reduce = useReduceMotion();

  const scale = useSharedValue(reduce ? 1 : 0.82);
  const fade = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    tapSuccess();
    /** The image springs in and the title fades in 40ms later. Under Reduce Motion both only fade. */
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
    <SheetModal onClose={onClose} height={0.9} dragAnywhere>
      <Grain opacity={0.035} />
      <View style={styles.body}>
        <View style={styles.stage}>
          <LinearGradient
            pointerEvents="none"
            colors={[colors.mapWater + '00', colors.mapWater + '5C', colors.mapWater + '00']}
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
            <Image source={rascalStand.source} style={styles.rascal} resizeMode="contain" />
          </Animated.View>
          <View style={styles.line}>
            <RascalBubble tail="left" delay={200} maxWidth={186}>{lines.saved}</RascalBubble>
          </View>
          <Text style={styles.sub}>
            {count > 1
              ? `${name} and ${count - 1} more are on the map for ${den?.name ?? 'your Den'}.`
              : `${name} is on the map for ${den?.name ?? 'your Den'}.`}
          </Text>
        </View>
        <PrimaryButton label={count > 1 ? 'See them on the map' : 'See it on the map'} onPress={onClose} />
        <TextButton label="Add another" onPress={onAddAnother} />
      </View>
    </SheetModal>
  );
}

const RASCAL_W = 176;

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl },
  stage: { flex: 1 },
  glow: { position: 'absolute', left: -60, right: -60, bottom: 0, height: '60%' },
  bubble: { position: 'absolute', borderWidth: 1.5, borderColor: colors.hairline },
  title: {
    position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center',
    fontFamily: type.display.fontFamily, fontSize: 52, lineHeight: 68,
    letterSpacing: -0.45, color: colors.ink,
  },
  /** Offset so the image starts at the title's baseline and does not cover the letters. */
  rascalWrap: { position: 'absolute', alignSelf: 'center', top: '30%', marginTop: 66, zIndex: 2 },
  rascal: { width: RASCAL_W, height: RASCAL_W / rascalStand.aspect },
  line: { position: 'absolute', right: 0, top: '30%', marginTop: -78, zIndex: 3 },
  sub: {
    position: 'absolute', left: 0, right: 0, top: '30%', marginTop: 286,
    ...type.body, color: colors.inkSecondary, textAlign: 'center',
  },
});
