/**
 * People — the tab, per §3. A Den is an object a person can hold several of,
 * so it can't be the destination; this is the Den that lives inside the tab.
 *
 * A small private social world, not a project workspace: emblem, name, roster,
 * invite, Stash count. Nothing configurable beyond the name.
 *
 * Invites are the six-character code, not a link: nobody owns ruckus.app yet,
 * so a link can't open the app. Joining another Den happens here too - the
 * code field in onboarding is only reachable before your first Den.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Field, Hint, Kicker } from '../components/Chrome';
import { CritterRoom } from '../components/CritterRoom';
import { IconChevronRight } from '../components/Icons';
import { Emblem } from '../components/Emblem';
import { useStash } from '../state/StashContext';
import { colors, radius, space, type } from '../theme/tokens';

export function PeopleScreen() {
  const { den, stash, savedCountBy, signOut, isPro, openPro, refreshSession } = useStash();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (den) api.getInviteLink(den.id).then(r => setInvite(r.code)).catch(() => {});
  }, [den]);

  /** Joining makes the new Den the active one: refreshSession picks the newest. */
  const join = async () => {
    setJoinBusy(true); setJoinError(null);
    try {
      await api.joinDen(code);
      setJoining(false); setCode('');
      await refreshSession();
    } catch (err) {
      // the free tier holds 2 Dens; a third is exactly what Ruckus Pro sells
      if ((err as { needsUpgrade?: boolean }).needsUpgrade) { await openPro(); return; }
      setJoinError(err instanceof Error && err.message ? err.message : "Couldn't join. Try again.");
    } finally {
      setJoinBusy(false);
    }
  };

  if (!den) return <View style={styles.root} />;

  const copy = async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: space.xxl }}
    >
      <View style={styles.pad}>
        <Emblem name={den.emblem} size={68} />
        <Text style={styles.title}>{den.name}</Text>
        <Text style={styles.meta}>
          {den.members.length} people · {stash.length} in the Stash
        </Text>

        <View style={{ height: 18 }} />
        {/* The Den as a room you look into — heads float, labelled in mono. */}
        <CritterRoom
          heads={den.members.map(m => ({
            key: m.userId, critter: m.critter, label: m.displayName,
            sub: `${savedCountBy.get(m.userId) ?? 0} saved`,
          }))}
        />
        <View style={{ height: 18 }} />

        <View style={styles.inviteBox}>
          <View style={{ flex: 1 }}>
            <Kicker>Invite code</Kicker>
            <Text style={styles.inviteUrl} numberOfLines={1}>
              {invite ?? 'Generating…'}
            </Text>
          </View>
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.copy, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        </View>

        <View style={{ height: space.md }} />
        <PrimaryButton
          label="Share invite"
          onPress={() => invite && Share.share({
            message: `Join my Den "${den.name}" on Ruckus - open the app, tap Join a Den, and enter ${invite}`,
          })}
        />

        <View style={{ height: 26 }} />
        <Pressable
          style={({ pressed }) => [styles.pro, pressed && { backgroundColor: colors.paperSunk }]}
          accessibilityRole="button"
          onPress={openPro}
        >
          <Emblem name="moon" size={32} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Ruckus Pro</Text>
            <Text style={styles.meta}>{isPro ? 'Manage your plan' : 'Unlimited Dens, no ads'}</Text>
          </View>
          <IconChevronRight />
        </Pressable>

        {joining ? (
          <View style={{ marginTop: space.lg }}>
            <Field
              label="Join a Den" value={code} onChangeText={setCode} placeholder="8FK2QD"
              autoCapitalize="characters" autoComplete="off" maxLength={8} autoFocus
            />
            {joinError ? <Hint style={styles.error}>{joinError}</Hint> : null}
            <View style={{ height: space.md }} />
            <PrimaryButton label="Join" onPress={join} loading={joinBusy} disabled={joinBusy || code.trim().length < 6} />
            <TextButton label="Cancel" onPress={() => { setJoining(false); setCode(''); setJoinError(null); }} muted />
          </View>
        ) : (
          <TextButton label="Join another Den" onPress={() => setJoining(true)} muted />
        )}
        <TextButton label="Switch Den" onPress={() => {}} muted />
        <TextButton label="Sign out" onPress={signOut} muted />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  pad: { paddingHorizontal: space.xl },
  title: { ...type.display, color: colors.ink, marginTop: space.lg },
  meta: { ...type.meta, color: colors.inkMuted, marginTop: 6 },
  inviteBox: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.paperSunk,
  },
  // the code is read aloud and typed off a screenshot: big, spaced, mono
  inviteUrl: { ...type.chip, fontSize: 22, letterSpacing: 4, color: colors.ink, marginTop: 5 },
  error: { color: colors.flare, marginTop: space.md },   // same as sign-in and onboarding
  copy: {
    height: 40, borderRadius: 20, paddingHorizontal: space.lg,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  copyLabel: { ...type.chip, fontSize: 14, color: colors.ink },
  pro: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: space.lg, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.hairline,
  },
  proTitle: { ...type.chip, fontSize: 16, color: colors.ink },
});
