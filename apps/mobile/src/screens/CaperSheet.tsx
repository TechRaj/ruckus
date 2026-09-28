/**
 * Turns a saved place into a Caper: one place, one day, and the people going.
 * Only someone who tapped "I'm in" on the place can open this.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Hint, Kicker } from '../components/Chrome';
import { CritterHead } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { IconCheck } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { SheetModal } from '../components/SheetModal';
import { dayChoices } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, edge, font, radius, space, type } from '../theme/tokens';

const TIMES = ['6 pm', '7 pm', '8 pm'];

export function CaperSheet({
  id, onClose, onMade,
}: { id: string; onClose: () => void; onMade: (caperId: string) => void }) {
  const { stash, memberById, currentUserId, createCaper } = useStash();
  const item = stash.find(s => s.id === id);
  const days = useMemo(() => dayChoices(), []);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  /** Null until someone is unticked. Until then everyone who is in is going. */
  const [picked, setPicked] = useState<string[] | null>(null);
  const going = picked ?? item?.interested ?? [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) {
    return (
      <SheetModal onClose={onClose} height={0.42}>
        <EmptyState line={lines.missingEvent} />
      </SheetModal>
    );
  }

  const toggle = (userId: string) =>
    setPicked(going.includes(userId) ? going.filter(u => u !== userId) : [...going, userId]);

  const lock = async () => {
    if (!day) return;
    setBusy(true); setError(null);
    try {
      const caper = await createCaper({ id: item.id, date: day, time, going });
      onMade(caper.id);
    } catch {
      setError(lines.caperFailed);
      setBusy(false);
    }
  };

  return (
    <SheetModal onClose={onClose} height={0.82} dismissable={!busy}>
      <ScrollView contentContainerStyle={styles.scroll} alwaysBounceVertical={false}>
        <Kicker>Make it a Caper</Kicker>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.where}>{item.neighbourhood}</Text>

        <Kicker style={styles.label}>Which day?</Kicker>
        <View style={styles.chips}>
          {days.map(d => (
            <Chip key={d.date} on={day === d.date} onPress={() => setDay(d.date)} label={d.label} note={d.short} />
          ))}
        </View>

        <Kicker style={styles.label}>What time? (optional)</Kicker>
        <View style={styles.chips}>
          {TIMES.map(t => (
            <Chip key={t} on={time === t} onPress={() => setTime(time === t ? null : t)} label={t} />
          ))}
        </View>

        <Kicker style={styles.label}>Who's going</Kicker>
        {item.interested.map(userId => {
          const m = memberById.get(userId);
          const me = userId === currentUserId;
          const on = going.includes(userId);
          return (
            <PressableScale
              key={userId}
              onPress={() => toggle(userId)}
              /** The person making the Caper is always going. */
              disabled={me}
              scaleTo={0.985}
              haptic="selection"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: me }}
              accessibilityLabel={m?.displayName ?? 'Someone'}
              style={styles.person}
            >
              {m ? <CritterHead critter={m.critter} size={38} /> : <View style={{ width: 38 }} />}
              <Text style={styles.name}>
                {m?.displayName ?? 'Someone'}{me ? <Text style={styles.you}>  you</Text> : null}
              </Text>
              <View style={[styles.tick, on && styles.tickOn]}>
                {on ? <IconCheck size={13} color={colors.onFlare} /> : null}
              </View>
            </PressableScale>
          );
        })}
        {error ? <Hint style={styles.error}>{error}</Hint> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Lock it in" onPress={lock} loading={busy} disabled={busy || !day} />
        <TextButton label="Not yet" onPress={onClose} muted />
      </View>
    </SheetModal>
  );
}

function Chip({
  label, note, on, onPress,
}: { label: string; note?: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={note ? `${label}, ${note}` : label}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipLabel, on && { color: colors.onFlare }]}>{label}</Text>
      {note ? <Text style={[styles.chipNote, on && { color: colors.onFlare }]}>{note}</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: 6, paddingBottom: space.md },
  title: { ...type.display, color: colors.ink, marginTop: 4 },
  where: { ...type.meta, fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  label: { marginTop: space.xl, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 44, paddingHorizontal: space.lg, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
  },
  chipOn: { backgroundColor: colors.flare, borderColor: colors.flareDeep, ...edge(colors.flareDeep, 3) },
  chipLabel: { ...type.chip, color: colors.inkSecondary },
  chipNote: { ...type.meta, color: colors.inkMuted },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 7 },
  name: { flex: 1, fontFamily: font.bold, fontSize: 16, color: colors.ink },
  you: { fontFamily: font.medium, fontSize: 13, color: colors.inkMuted },
  tick: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.hairline,
  },
  tickOn: { backgroundColor: colors.flare, borderColor: colors.flareDeep },
  error: { color: colors.warn, marginTop: space.md },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm },
});
