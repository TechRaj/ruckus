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
import { MonthCalendar } from '../components/MonthCalendar';
import { PressableScale } from '../components/PressableScale';
import { SheetModal } from '../components/SheetModal';
import { dayChoices, dayLabel } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, edge, font, radius, space, type } from '../theme/tokens';

const TIMES = ['6 pm', '7 pm', '8 pm'];
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** "7 pm", "7:30 pm": the :00 is left off, matching the quick picks. */
const timeText = (hour: number, half: boolean, pm: boolean) => `${hour}${half ? ':30' : ''} ${pm ? 'pm' : 'am'}`;

export function CaperSheet({
  id, onClose, onMade,
}: { id: string; onClose: () => void; onMade: (caperId: string) => void }) {
  const { stash, memberById, currentUserId, createCaper } = useStash();
  const item = stash.find(s => s.id === id);
  const days = useMemo(() => dayChoices(), []);
  const [day, setDay] = useState<string | null>(null);
  /** The calendar, for a day beyond the quick picks. */
  const [calendar, setCalendar] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  /** The clock, for a time beyond the quick picks. */
  const [clock, setClock] = useState(false);
  const [hour, setHour] = useState(7);
  const [half, setHalf] = useState(false);
  const [pm, setPm] = useState(true);
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
            <Chip key={d.date} on={day === d.date} onPress={() => { setDay(d.date); setCalendar(false); }} label={d.label} note={d.short} />
          ))}
          {/* a day the quick picks do not cover shows here once chosen */}
          <Chip
            on={calendar || (day !== null && !days.some(d => d.date === day))}
            onPress={() => setCalendar(!calendar)}
            label={day && !days.some(d => d.date === day) ? dayLabel(day) : 'Another day'}
          />
        </View>
        {calendar ? (
          <View style={styles.calendar}>
            <MonthCalendar value={day} onChange={setDay} />
          </View>
        ) : null}

        <Kicker style={styles.label}>What time? (optional)</Kicker>
        <View style={styles.chips}>
          {TIMES.map(t => (
            <Chip key={t} on={time === t} onPress={() => { setTime(time === t ? null : t); setClock(false); }} label={t} />
          ))}
          {/* a time the quick picks do not cover shows here once chosen */}
          <Chip
            on={clock || (time !== null && !TIMES.includes(time))}
            onPress={() => {
              if (clock) { setClock(false); return; }
              setClock(true);
              setTime(timeText(hour, half, pm));
            }}
            label={time && !TIMES.includes(time) ? time : 'Another time'}
          />
        </View>
        {clock ? (
          <View style={styles.clock}>
            <View style={styles.chips}>
              {HOURS.map(h => (
                <Chip key={h} on={hour === h} small onPress={() => { setHour(h); setTime(timeText(h, half, pm)); }} label={String(h)} />
              ))}
            </View>
            <View style={[styles.chips, { marginTop: space.sm }]}>
              <Chip on={!half} small onPress={() => { setHalf(false); setTime(timeText(hour, false, pm)); }} label=":00" />
              <Chip on={half} small onPress={() => { setHalf(true); setTime(timeText(hour, true, pm)); }} label=":30" />
              <View style={{ width: space.sm }} />
              <Chip on={!pm} small onPress={() => { setPm(false); setTime(timeText(hour, half, false)); }} label="am" />
              <Chip on={pm} small onPress={() => { setPm(true); setTime(timeText(hour, half, true)); }} label="pm" />
            </View>
            <TextButton label="No time after all" onPress={() => { setTime(null); setClock(false); }} muted />
          </View>
        ) : null}

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
  label, note, on, onPress, small,
}: { label: string; note?: string; on: boolean; onPress: () => void; small?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={note ? `${label}, ${note}` : label}
      style={[styles.chip, small && styles.chipSmall, on && styles.chipOn]}
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
  calendar: { marginTop: space.md },
  clock: { marginTop: space.md, alignItems: 'flex-start' },
  /** Hours and halves: a tighter chip, so twelve fit in two rows. */
  chipSmall: { height: 40, paddingHorizontal: 0, minWidth: 48, justifyContent: 'center' },
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
