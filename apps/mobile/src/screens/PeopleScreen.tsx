/**
 * People tab. Shows the active Den, its members and invite code, and the panel for switching, joining and making Dens.
 * Invites use the six-character code because the ruckus.app domain is not set up for universal links.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
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
import { ROOM_WARNING } from '../types';
import { lines } from '../theme/lines';
import { chooseSound, playTap, soundOn } from '../theme/sound';
import { colors, radius, space, type } from '../theme/tokens';

export function PeopleScreen() {
  const { den, dens, switchDen, stash, savedCountBy, openOverlay, isPro, openPro, refreshSession, capacity, denAllowance } = useStash();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Den panel state. */
  const [panel, setPanel] = useState<'closed' | 'switch' | 'join' | 'new'>('closed');
  const [code, setCode] = useState('');
  const [denName, setDenName] = useState('');
  const [emblem, setEmblem] = useState<string>(EMBLEMS[0]);
  const [sounds, setSounds] = useState(soundOn());
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  useEffect(() => {
    if (den) api.getInviteLink(den.id).then(r => setInvite(r.code)).catch(() => {});
  }, [den]);

  const closePanel = () => { setPanel('closed'); setCode(''); setDenName(''); setPanelError(null); };

  /** Joins or makes a Den, then switches to it. Opens the paywall when the free Den limit is reached. */
  const run = async (action: () => Promise<{ id: string }>, retried = false): Promise<void> => {
    setBusy(true); setPanelError(null);
    try {
      const d = await action();
      closePanel();
      await refreshSession(d.id);
    } catch (err) {
      if ((err as { needsUpgrade?: boolean }).needsUpgrade) {
        // bought Pro and the server knows -> do what they were trying to do
        if ((await openPro()) && !retried) return run(action, true);
        return;
      }
      setPanelError(err instanceof Error && err.message ? err.message : 'That didn\'t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!den) return <View style={styles.root} />;

  // The Den's free place limit. Nothing shows for a Pro-owned Den (no limit).
  const limit = capacity?.placeLimit ?? null;
  const places = capacity?.places ?? stash.length;
  const full = limit != null && places >= limit;
  const showRoom = limit != null && places >= Math.ceil(limit * ROOM_WARNING);
  const owner = den.members.find(m => m.role === 'owner')?.displayName ?? 'the owner';
  const roomLine = !showRoom ? null
    : capacity?.iOwnIt ? (full ? lines.room.fullOwner : lines.room.nearlyFullOwner)
    : (full ? lines.room.full(owner) : lines.room.nearlyFull(owner));

  const copy = async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 14 }]}>
      {/* Outside the scroll view, so it stays where it is on the other tabs when the page scrolls. */}
      <View style={styles.pad}><ThemeSwitch /></View>
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
      <View style={styles.pad}>
        <Emblem name={den.emblem} size={68} />
        <Text style={styles.title}>{den.name}</Text>
        <Text style={[styles.meta, styles.tabular]}>
          {den.members.length} people · {limit != null ? `${places} of ${limit} places` : `${stash.length} in the Stash`}
        </Text>
        {showRoom ? (
          <View style={styles.room}>
            <View
              style={styles.roomTrack}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Room in this Den"
              accessibilityValue={{ min: 0, max: limit ?? 0, now: places }}
            >
              <View style={[styles.roomFill, {
                width: `${Math.min(100, Math.round((places / (limit || 1)) * 100))}%`,
                backgroundColor: full ? colors.warn : colors.inkMuted,
              }]} />
            </View>
            {roomLine ? <Text style={[styles.roomLine, full && { color: colors.warn }]}>{roomLine}</Text> : null}
            {capacity?.iOwnIt ? <TextButton label="Get Ruckus Pro" onPress={openPro} /> : null}
          </View>
        ) : null}

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
          onPress={() => { playTap(); openPro(); }}
        >
          <Emblem name="moon" size={32} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Ruckus Pro</Text>
            <Text style={styles.meta}>{isPro ? 'Manage your plan' : 'Unlimited Dens and places'}</Text>
          </View>
          <IconChevronRight />
        </Pressable>

        <View style={[styles.pro, { marginTop: space.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Sounds</Text>
          </View>
          <Switch
            value={sounds}
            onValueChange={next => {
              setSounds(next);
              chooseSound(next);
              /** Turning them on is the first thing you hear. */
              if (next) playTap();
            }}
            trackColor={{ true: colors.flareDeep, false: colors.paperSunk }}
            accessibilityLabel="Sounds"
          />
        </View>

        {panel === 'closed' ? (
          <TextButton label={dens.length > 1 ? `Switch Den · ${dens.length}` : 'Switch or add a Den'} onPress={() => setPanel('switch')} muted />
        ) : (
          <View style={styles.panel}>
            {panel === 'switch' ? (
              <>
                <Kicker>{denAllowance?.denLimit != null ? `Your Dens · ${denAllowance.dens} of ${denAllowance.denLimit}` : 'Your Dens'}</Kicker>
                <View style={{ height: space.sm }} />
                {dens.map(d => {
                  const here = d.id === den.id;
                  return (
                    <Pressable
                      key={d.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: here }}
                      onPress={async () => { playTap(); closePanel(); await switchDen(d.id); }}
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
                    <PressableScale
                      key={e}
                      haptic="selection"
                      scaleTo={0.94}
                      accessibilityRole="button"
                      accessibilityLabel={e}
                      accessibilityState={{ selected: emblem === e }}
                      onPress={() => setEmblem(e)}
                      style={[styles.emblemPick, emblem === e && styles.emblemPicked]}
                    >
                      <Emblem name={e} size={36} />
                    </PressableScale>
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
        <TextButton label="Sign out" onPress={() => openOverlay({ kind: 'sign-out' })} muted />
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // changing numbers keep their width, so the line doesn't shift as it counts
  tabular: { fontVariant: ['tabular-nums'] },
  room: { marginTop: space.md, gap: space.sm },
  roomTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.paperSunk, overflow: 'hidden' },
  roomFill: { height: '100%', borderRadius: radius.pill },
  roomLine: { ...type.hint, color: colors.inkSecondary },
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
