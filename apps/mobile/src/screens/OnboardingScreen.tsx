/**
 * Onboarding — brief §24, with the critter step first (decided 31 Aug).
 *
 * Two fast steps: who are you, then who's this with. §13.2 — both steps now
 * keep what they collect. The first pass asked for a critter and threw the
 * answer away, and never asked your name at all.
 */
import { useState } from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Field, Hint, Kicker } from '../components/Chrome';
import { CritterRoom } from '../components/CritterRoom';
import { EMBLEMS, Emblem } from '../components/Emblem';
import { Grain } from '../components/Grain';
import { IconChevronLeft, PawPrint } from '../components/Icons';
import { RASCAL_ASPECT, rascal } from '../theme/critters';
import { lines } from '../theme/lines';
import { colors, launchCritters, space, type } from '../theme/tokens';
import { Critter as CritterName } from '../types';

type Step = 'welcome' | 'you' | 'den';

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [critter, setCritter] = useState<CritterName>('raccoon');
  const [denName, setDenName] = useState('');
  const [emblem, setEmblem] = useState<string>('lantern');

  const pad = { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 };

  if (step === 'welcome') {
    return (
      <View style={[styles.root, pad]}>
        <Grain opacity={0.035} />
        <View style={styles.hero}>
          {/* light through water, low on the screen */}
          <LinearGradient
            pointerEvents="none"
            colors={[colors.mapWater + '00', colors.mapWater + '4D']}
            style={styles.glow}
          />
          <Kicker>A places app for friends</Kicker>
          <Text style={styles.wordmark}>Ruckus</Text>
          {/* Rascal's ears touch the wordmark's baseline */}
          <View style={styles.heroArt}>
            <Image source={rascal} style={styles.rascal} resizeMode="contain" />
          </View>
          <Text style={styles.tagline}>Places worth leaving the group chat for.</Text>
        </View>
        <PrimaryButton label="Get started" onPress={() => setStep('you')} />
        <Pressable onPress={onDone} style={styles.joinHint} accessibilityRole="button">
          <Hint style={{ textAlign: 'center' }}>{lines.hint.joinLink}</Hint>
        </Pressable>
      </View>
    );
  }

  if (step === 'you') {
    return (
      <View style={[styles.root, pad]}>
        <Back onPress={() => setStep('welcome')} />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.headline}>Set yourself up</Text>
          <Text style={styles.sub}>
            This is how you'll show up on the map and in your Den.
          </Text>
          <View style={{ height: 26 }} />
          <Field label="Your name" value={name} onChangeText={setName} placeholder="Amelia" />
          <View style={{ height: 22 }} />
          <Kicker style={{ marginBottom: space.md }}>Your critter</Kicker>
          <CritterRoom
            heads={launchCritters.map(c => ({ key: c, critter: c, label: c, selected: critter === c }))}
            onPick={k => setCritter(k as CritterName)}
          />
        </ScrollView>
        <PrimaryButton
          label="That's me"
          onPress={() => setStep('den')}
          disabled={name.trim().length === 0}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, pad]}>
      <Back onPress={() => setStep('you')} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.headline}>Who's this with?</Text>
        <Text style={styles.sub}>
          A Den is your group. Everything you save is shared with them.
        </Text>
        <View style={{ height: 28 }} />
        <Field
          label="Name your Den"
          value={denName}
          onChangeText={setDenName}
          placeholder="Toronto Shenanigans"
        />
        <View style={{ height: 24 }} />
        <Kicker>Pick an emblem</Kicker>
        <View style={styles.emblems}>
          {EMBLEMS.map(e => (
            <Pressable
              key={e}
              onPress={() => setEmblem(e)}
              accessibilityRole="radio"
              accessibilityState={{ selected: emblem === e }}
              style={[styles.emblemTile, emblem === e && styles.tileOn]}
            >
              <Emblem name={e} size={32} />
            </Pressable>
          ))}
        </View>
        <View style={styles.note}>
          <PawPrint size={26} />
          <Hint style={{ flex: 1 }}>{lines.hint.moreDens}</Hint>
        </View>
      </ScrollView>
      <PrimaryButton
        label="Create the Den"
        onPress={onDone}
        disabled={denName.trim().length === 0}
      />
      <TextButton label="I have an invite link instead" onPress={onDone} />
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.back} accessibilityLabel="Back">
      <IconChevronLeft />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.xl },
  hero: { flex: 1, justifyContent: 'center' },
  glow: { position: 'absolute', left: -60, right: -60, bottom: 40, height: '40%' },
  /** Rascal starts 12px above the wordmark's baseline so his ears overlap it. */
  heroArt: { height: 200, marginTop: -12 },
  rascal: { position: 'absolute', left: -4, top: 0, width: 200, height: 200 / RASCAL_ASPECT },
  wordmark: {
    fontFamily: type.display.fontFamily, fontSize: 72, lineHeight: 74,
    letterSpacing: -0.6, color: colors.ink, marginTop: 6,
  },
  tagline: { ...type.body, fontSize: 17, lineHeight: 24, color: colors.inkSecondary, marginTop: 12, maxWidth: 300 },
  joinHint: { height: 44, justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -11 },
  headline: { ...type.display, color: colors.ink, marginTop: 10 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 10 },
  tileOn: { borderColor: colors.flare, backgroundColor: colors.flareWash },
  emblems: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  emblemTile: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
  },
});
