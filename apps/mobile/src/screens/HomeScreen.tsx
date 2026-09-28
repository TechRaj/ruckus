/** Home tab. Shows places that are close to becoming a plan and recent saves in the Den. */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RowButton } from '../components/Buttons';
import { PressableScale } from '../components/PressableScale';
import { Kicker, ScreenHeader } from '../components/Chrome';
import { CritterHead, CritterStack } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { SkyCard } from '../components/SkyCard';
import { Sprite } from '../components/Sprite';
import { jump } from '../theme/sprites';
import { ago, dayLabel, dayParts, dotted } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, font, radius, space, type } from '../theme/tokens';
import { Member } from '../types';

const RASCAL_WIDTH = 132;

export function HomeScreen() {
  const {
    den, stash, nearlyPlans, upcoming, currentUserId, memberById, openOverlay, toggleInterest,
  } = useStash();
  const insets = useSafeAreaInsets();

  /** Latest saves in the Den. Includes the current user's so Home is never empty while Places has rows. */
  const recent = useMemo(() => [...stash]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, 6), [stash]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: space.xxl }}
    >
      <View>
        <ScreenHeader kicker={den?.name ?? 'Ruckus'} title="This week" />
        <Sprite sheet={jump} width={RASCAL_WIDTH} style={styles.rascal} accessibilityLabel="Rascal hopping" />
      </View>
      <SkyCard name={currentUserId ? memberById.get(currentUserId)?.displayName : undefined} />

      {upcoming.length > 0 ? (
        <>
          <View style={styles.sectionLabel}><Kicker>Coming up</Kicker></View>
          {upcoming.map(({ caper, place }) => {
            const day = dayParts(caper.date);
            return (
              <PressableScale
                key={caper.id}
                onPress={() => openOverlay({ kind: 'detail', id: place.id })}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={`${place.name}, ${dotted(dayLabel(caper.date), caper.time)}`}
                style={styles.caper}
              >
                <View style={styles.date}>
                  <Text style={styles.dateDay}>{day.weekday.toUpperCase()}</Text>
                  <Text style={styles.dateNumber}>{day.date}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.planPlace} numberOfLines={1}>{place.name}</Text>
                  <Text style={styles.planMeta} numberOfLines={1}>
                    {dotted(dayLabel(caper.date), caper.time, place.neighbourhood)}
                  </Text>
                </View>
                <CritterStack
                  members={caper.going.map(id => memberById.get(id)).filter(Boolean) as Member[]}
                  size={30}
                />
              </PressableScale>
            );
          })}
        </>
      ) : null}

      {nearlyPlans.length > 0 ? (
        <View style={styles.plan}>
          <View style={styles.planHead}>
            <View style={styles.dot} />
            <Text style={styles.planKicker}>
              {nearlyPlans.length === 1 ? 'One place is' : `${nearlyPlans.length === 2 ? 'Two' : nearlyPlans.length} places are`} nearly a plan
            </Text>
          </View>
          {nearlyPlans.slice(0, 3).map(s => (
            <View key={s.id} style={styles.planRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.planPlace} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.planMeta} numberOfLines={1}>
                  {dotted(s.neighbourhood, `${s.wantCount} in`)}
                </Text>
              </View>
              {/* Only someone who is in can make the Caper. Anyone else is offered "I'm in" first. */}
              {s.iWant
                ? <RowButton label="Make it a Caper" onPress={() => openOverlay({ kind: 'caper', id: s.id })} />
                : <RowButton label="I'm in" tone="paper" onPress={() => toggleInterest(s.id)} />}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionLabel}><Kicker>Lately</Kicker></View>

      {recent.length === 0 ? (
        <EmptyState line={lines.quietHome} />
      ) : recent.map(s => {
        const m = memberById.get(s.savedBy);
        return (
          <View key={s.id} style={styles.activity}>
            {m ? <CritterHead critter={m.critter} size={44} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.activityLine}>
                <Text style={styles.strong}>{s.savedBy === currentUserId ? 'You' : m?.displayName ?? 'Someone'}</Text>
                <Text> stashed </Text>
                <Text style={styles.strong}>{s.name}</Text>
              </Text>
              <Text style={styles.activityMeta} numberOfLines={1}>{s.note || s.neighbourhood}</Text>
            </View>
            <Text style={styles.activityMeta}>{ago(s.savedAt)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  /** Beside the title, feet on the top edge of the sky card. The frame leaves room above for the hop. */
  rascal: { position: 'absolute', right: space.lg, bottom: -20, zIndex: 1 },
  plan: {
    marginTop: space.xl, marginHorizontal: space.xl,
    backgroundColor: colors.butterWash, borderRadius: radius.xl + 2, padding: 20,
  },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.warn },
  planKicker: { ...type.rowTitle, fontSize: 16, color: colors.ink, flex: 1 },
  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9,
  },
  planPlace: { ...type.rowTitle, fontSize: 17, color: colors.ink },
  planMeta: { ...type.meta, color: colors.inkSecondary, marginTop: 1 },
  caper: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginHorizontal: space.xl, marginBottom: space.sm, padding: space.md,
    borderRadius: radius.xl, backgroundColor: colors.flareWash,
    borderWidth: 1.5, borderColor: colors.flare,
  },
  date: {
    width: 52, paddingVertical: 5, borderRadius: radius.lg - 4, alignItems: 'center',
    backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.flareDeep,
  },
  dateDay: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1, color: colors.inkMuted },
  dateNumber: { fontFamily: font.display, fontSize: 22, lineHeight: 26, color: colors.ink },
  sectionLabel: { paddingHorizontal: space.xl, paddingTop: 28, paddingBottom: space.md },
  activity: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
    paddingVertical: space.lg, paddingHorizontal: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  activityLine: { ...type.bodyMed, color: colors.inkSecondary },
  strong: { fontFamily: font.bold, color: colors.ink },
  activityMeta: { ...type.meta, color: colors.inkMuted, marginTop: 3 },
});
