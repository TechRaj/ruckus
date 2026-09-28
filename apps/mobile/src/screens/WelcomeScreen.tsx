/**
 * The first screen for someone new to the app on this device. It comes
 * before sign-in: Get started leads to the email and code, then onboarding.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Kicker } from '../components/Chrome';
import { Grain } from '../components/Grain';
import { Sprite } from '../components/Sprite';
import { trashcan } from '../theme/sprites';
import { colors, space, type } from '../theme/tokens';

const ART_WIDTH = 200;

export function WelcomeScreen({
  onStart, onSignIn,
}: { onStart: () => void; onSignIn: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <Grain opacity={0.035} />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.mapWater + '00', colors.mapWater + '4D', colors.mapWater + '00']}
        style={styles.glow}
      />
      <View>
        <Kicker>A places app for friends</Kicker>
        <Text style={styles.wordmark}>Ruckus</Text>
        {/* One line on every phone: it shrinks a little on a narrow screen instead of wrapping. */}
        <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          For plans that make it out of the chat.
        </Text>
        <Sprite
          sheet={trashcan} width={ART_WIDTH} style={styles.heroArt}
          accessibilityLabel="A raccoon popping out of a trash can"
        />
      </View>
      {/* Drawn after the can, so the button covers the can's flat base. */}
      <PrimaryButton label="Get started" onPress={onStart} />
      <TextButton label="I already have an account" onPress={onSignIn} muted />
    </View>
  );
}

const styles = StyleSheet.create({
  /** One block, button included, centred between the top and bottom insets. */
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.xl, justifyContent: 'center' },
  glow: { position: 'absolute', left: 0, right: 0, top: '30%', height: '50%' },
  /** The can stands on the button: the overlap hides the base, which the art cuts off flat. */
  heroArt: { alignSelf: 'center', marginTop: space.sm, marginBottom: -8 },
  wordmark: {
    /** Baloo 2 clips the tops of letters when lineHeight is under about 1.3 times fontSize. */
    fontFamily: type.display.fontFamily, fontSize: 72, lineHeight: 96,
    color: colors.ink, marginTop: -4,
  },
  /** Pulled up into the empty space the wordmark's tall line leaves under its letters. */
  tagline: { ...type.body, fontSize: 16, lineHeight: 24, color: colors.inkSecondary, marginTop: -12 },
});
