/**
 * People tab. Shows the active Den, its members and invite code, and the panel for switching, joining and making Dens.
 * Invites use the six-character code because the ruckus.app domain is not set up for universal links.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Field, Hint, Kicker } from '../components/Chrome';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { CritterRoom } from '../components/CritterRoom';
import { IconChevronRight } from '../components/Icons';
import { EMBLEMS, Emblem } from '../components/Emblem';
import { PressableScale } from '../components/PressableScale';
import { useStash } from '../state/StashContext';
import { colors, radius, space, type } from '../theme/tokens';

export function PeopleScreen() {
  const { den, dens, switchDen, stash, savedCountBy, signOut, isPro, openPro, refreshSession } = useStash();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Den panel state. */
  const [panel, setPanel] = useState<'closed' | 'switch' | 'join' | 'new'>('closed');
  const [code, setCode] = useState('');
  const [denName, setDenName] = useState('');
  const [emblem, setEmblem] = useState<string>(EMBLEMS[0]);
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  useEffect(() => {
    if (den) api.getInviteLink(den.id).then(r => setInvite(r.code)).catch(() => {});
  }, [den]);

  const closePanel = () => { setPanel('closed'); setCode(''); setDenName(''); setPanelError(null); };

  /** Joins or makes a Den, then switches to it. Opens the paywall when the free Den limit is reached. */
  const run = async (action: () => Promise<{ id: string }>) => {
    setBusy(true); setPanelError(null);
    try {
      const d = await action();
      closePanel();
      await refreshSession(d.id);
    } catch (err) {
      if ((err as { needsUpgrade?: boolean }).needsUpgrade) { await openPro(); return; }
      setPanelError(err instanceof Error && err.message ? err.message : 'That didn\'t work. Try again.');
    } finally {
      setBusy(false);
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
        <ThemeSwitch />
        <Emblem name={den.emblem} size={68} />
        <Text style={styles.title}>{den.name}</Text>
        <Text style={styles.meta}>
          {den.members.length} people · {stash.length} in the Stash
        </Text>

        <View style={{ height: 18 }} />
        <CritterRoom
          compact={den.members.length <= 4}
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
          <PressableScale onPress={copy} haptic="selection" accessibilityRole="button" style={styles.copy}>
            <Text style={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
          </PressableScale>
        </View>

        <View style={{ height: space.md }} />
        <PrimaryButton
          label="Share invite"
          onPress={() => invite && Share.share({
            message: `Join my Den "${den.name}" on Ruckus. Open the app, tap Join a Den, and enter ${invite}`,
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

        {panel === 'closed' ? (
          <TextButton label={dens.length > 1 ? `Switch Den · ${dens.length}` : 'Switch or add a Den'} onPress={() => setPanel('switch')} muted />
        ) : (
          <View style={styles.panel}>
            {panel === 'switch' ? (
              <>
                <Kicker>Your Dens</Kicker>
                <View style={{ height: space.sm }} />
                {dens.map(d => {
                  const here = d.id === den.id;
                  return (
                    <Pressable
                      key={d.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: here }}
                      onPress={async () => { closePanel(); await switchDen(d.id); }}
                      style={({ pressed }) => [styles.denRow, pressed && { backgroundColor: colors.paperSunk }]}
                    >
                      <Emblem name={d.emblem} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.denName}>{d.name}</Text>
                        <Text style={styles.meta}>{d.members.length} {d.members.length === 1 ? 'person' : 'people'}</Text>
                      </View>
                      {here ? <Text style={styles.here}>Here</Text> : <IconChevronRight />}
                    </Pressable>
                  );
                })}
                <View style={{ height: space.md }} />
                <TextButton label="Join a Den with a code" onPress={() => setPanel('join')} />
                <TextButton label="Make a new Den" onPress={() => setPanel('new')} />
              </>
            ) : panel === 'join' ? (
              <>
                <Field
                  label="Join a Den" value={code} onChangeText={setCode} placeholder="8FK2QD"
                  autoCapitalize="characters" autoComplete="off" maxLength={8} autoFocus
                />
                {panelError ? <Hint style={styles.error}>{panelError}</Hint> : null}
                <View style={{ height: space.md }} />
                <PrimaryButton label="Join" onPress={() => run(() => api.joinDen(code))} loading={busy} disabled={busy || code.trim().length < 6} />
              </>
            ) : (
              <>
                <Field
                  label="Name your Den" value={denName} onChangeText={setDenName} placeholder="Toronto Shenanigans"
                  autoCapitalize="words" maxLength={60} autoFocus
                />
                <View style={{ height: space.md }} />
                <Kicker>Pick an emblem</Kicker>
                <View style={styles.emblems}>
                  {EMBLEMS.map(e => (
                    <Pressable
                      key={e}
                      accessibilityRole="button"
                      accessibilityLabel={e}
                      accessibilityState={{ selected: emblem === e }}
                      onPress={() => setEmblem(e)}
                      style={[styles.emblemPick, emblem === e && styles.emblemPicked]}
                    >
                      <Emblem name={e} size={36} />
                    </Pressable>
                  ))}
                </View>
                {panelError ? <Hint style={styles.error}>{panelError}</Hint> : null}
                <View style={{ height: space.md }} />
                <PrimaryButton label="Make the Den" onPress={() => run(() => api.createDen(denName.trim(), emblem))} loading={busy} disabled={busy || !denName.trim()} />
              </>
            )}
            <TextButton label={panel === 'switch' ? 'Close' : 'Back'} onPress={() => (panel === 'switch' ? closePanel() : (setPanel('switch'), setPanelError(null)))} muted />
          </View>
        )}
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
  // Large and letter-spaced because the code gets read aloud and retyped.
  inviteUrl: { ...type.chip, fontSize: 22, letterSpacing: 4, color: colors.ink, marginTop: 5 },
  error: { color: colors.warn, marginTop: space.md },   // same as sign-in and onboarding
  panel: { marginTop: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.paperSunk },
  denRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.lg,
  },
  denName: { ...type.rowTitle, fontSize: 17, color: colors.ink },
  here: { ...type.chip, color: colors.inkMuted },
  emblems: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  emblemPick: { padding: 6, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  emblemPicked: { borderColor: colors.flareDeep, backgroundColor: colors.flareWash },
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
