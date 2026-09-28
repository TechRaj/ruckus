/** Home tab. Shows places that are close to becoming a plan and recent saves in the Den. */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/Buttons';
import { Kicker, ScreenHeader } from '../components/Chrome';
import { CritterHead, CritterStack } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { SkyCard } from '../components/SkyCard';
import { ago, dotted } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, font, radius, space, type } from '../theme/tokens';
import { Member } from '../types';

export function HomeScreen() {
  const { den, stash, nearlyPlans, currentUserId, memberById } = useStash();
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
      <ScreenHeader kicker={den?.name ?? 'Ruckus'} title="This week" />
      <SkyCard name={currentUserId ? memberById.get(currentUserId)?.displayName : undefined} />

      {nearlyPlans.length >= 2 ? (
        <View style={styles.plan}>
          <View style={styles.planHead}>
            <View style={styles.dot} />
            <Text style={styles.planKicker}>
              {nearlyPlans.length === 2 ? 'Two' : nearlyPlans.length} places are nearly a plan
            </Text>
          </View>
          {nearlyPlans.slice(0, 3).map(s => (
            <View key={s.id} style={styles.planRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planPlace}>{s.name}</Text>
                <Text style={styles.planMeta}>{dotted(s.neighbourhood, s.distance)}</Text>
              </View>
              {s.interested.length > 0 ? (
                <CritterStack
                  members={s.interested.map(id => memberById.get(id)).filter(Boolean) as Member[]}
                  size={32}
                />
              ) : (
                <Kicker>{`${s.wantCount} in`}</Kicker>
              )}
            </View>
          ))}
          <View style={{ height: space.lg }} />
          <PrimaryButton label="Make it a Caper" onPress={() => {}} />
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
