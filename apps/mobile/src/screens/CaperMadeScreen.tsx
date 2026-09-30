/** Shown after a Caper is locked in. Offers to send the plan to a group chat. */
import { useEffect } from 'react';
import { Image, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Kicker } from '../components/Chrome';
import { CritterStack } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { Grain } from '../components/Grain';
import { SheetModal } from '../components/SheetModal';
import { dayLabel, dotted } from '../lib/time';
import { useStash } from '../state/StashContext';
import { rascalStand } from '../theme/critters';
import { lines } from '../theme/lines';
import { EASE_OUT, tapSuccess, useReduceMotion } from '../theme/motion';
import { playConfirm } from '../theme/sound';
import { colors, radius, space, type } from '../theme/tokens';
import { Member } from '../types';

const RASCAL_W = 150;

export function CaperMadeScreen({ caperId, onClose }: { caperId: string; onClose: () => void }) {
  const { upcoming, memberById } = useStash();
  const reduce = useReduceMotion();
  const plan = upcoming.find(u => u.caper.id === caperId);

  useEffect(() => { tapSuccess(); playConfirm(); }, []);

  if (!plan) {
    return (
      <SheetModal onClose={onClose} height={0.42}>
        <EmptyState line={lines.missingEvent} />
      </SheetModal>
    );
  }

  const { caper, place } = plan;
  const when = [dayLabel(caper.date), caper.time].filter(Boolean).join(', ');
  const message = `Caper: ${place.name}, ${when}. You in?`;
  const going = caper.going.map(u => memberById.get(u)).filter(Boolean) as Member[];

  return (
    <SheetModal onClose={onClose} height={0.9} dragAnywhere>
      <Grain opacity={0.035} />
      <View style={styles.body}>
        <View style={styles.stage}>
          <Animated.View entering={reduce ? undefined : FadeIn.duration(220).easing(EASE_OUT)}>
            <Image source={rascalStand.source} style={styles.rascal} resizeMode="contain" />
          </Animated.View>
          <Kicker>It's a Caper</Kicker>
          <Text style={styles.title}>{place.name}</Text>
          <Text style={styles.when}>{dotted(when, place.neighbourhood)}</Text>
          <View style={{ height: space.md }} />
          <CritterStack members={going} size={36} />
          <View style={styles.message}>
            <Kicker>What gets sent</Kicker>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        </View>
        <PrimaryButton label="Share with the group" onPress={() => { Share.share({ message }).catch(() => {}); }} />
        <TextButton label="Done" onPress={onClose} />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rascal: { width: RASCAL_W, height: RASCAL_W / rascalStand.aspect, marginBottom: space.sm },
  title: { ...type.display, color: colors.ink, textAlign: 'center', marginTop: 2 },
  when: { ...type.body, color: colors.inkSecondary, textAlign: 'center', marginTop: 2 },
  message: {
    alignSelf: 'stretch', marginTop: space.xl, padding: space.lg, borderRadius: radius.xl,
    backgroundColor: colors.paperSunk, borderWidth: 1.5, borderColor: colors.hairline, gap: 4,
  },
  messageText: { ...type.bodyMed, color: colors.ink },
});
