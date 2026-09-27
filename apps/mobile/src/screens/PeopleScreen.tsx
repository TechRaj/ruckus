/**
 * People — the tab, per §3. A Den is an object a person can hold several of,
 * so it can't be the destination; this is the Den that lives inside the tab.
 *
 * A small private social world, not a project workspace: emblem, name, roster,
 * invite, Stash count. Nothing configurable beyond the name.
 *
 * Invites are the six-character code, not a link: nobody owns ruckus.app yet,
 * so a link can't open the app. Switching, joining and making Dens all happen
 * in the Den panel here - onboarding is only reachable before your first Den.
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
import { EMBLEMS, Emblem } from '../components/Emblem';
import { useStash } from '../state/StashContext';
import { colors, radius, space, type } from '../theme/tokens';

export function PeopleScreen() {
  const { den, dens, switchDen, stash, savedCountBy, signOut, isPro, openPro, refreshSession } = useStash();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** The Den panel: closed, the list of my Dens, joining one, or making one. */
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

  /**
   * Join or make a Den, then land on it. A third Den on the free tier is
   * exactly what Ruckus Pro sells, so that error opens the paywall instead.
   */
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
  // the code is read aloud and typed off a screenshot: big, spaced, mono
  inviteUrl: { ...type.chip, fontSize: 22, letterSpacing: 4, color: colors.ink, marginTop: 5 },
  error: { color: colors.flare, marginTop: space.md },   // same as sign-in and onboarding
  panel: { marginTop: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.paperSunk },
  denRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.lg,
  },
  denName: { ...type.body, color: colors.ink, fontWeight: '600' },
  here: { ...type.chip, color: colors.inkMuted },
  emblems: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  emblemPick: { padding: 6, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  emblemPicked: { borderColor: colors.flare },
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
