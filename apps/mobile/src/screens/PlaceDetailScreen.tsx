/**
 * Place detail. Shows the saver's note, comments, the "I'm in" toggle, and links to directions and the original post.
 * CLAUDE.md §5.6: store the reel URL, never the reel. Link out to the post, no oEmbed or inline preview.
 */
import { useRef, useState } from 'react';
import {
  Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { keyboardDismissMode, Kicker } from '../components/Chrome';
import { CritterHead, CritterStack } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { IconCheck, IconExternal, IconNav } from '../components/Icons';
import { SheetModal } from '../components/SheetModal';
import { TakeCard } from '../components/TakeCard';
import { useSafetyMenu } from '../hooks/useSafetyMenu';
import { ago, dotted, eventLabel, stashedWhen } from '../lib/time';
import { useStash } from '../state/StashContext';
import { useDevScrollEnd } from '../lib/devBus';
import { lines } from '../theme/lines';
import { EASE_OUT, tapImpact, useReduceMotion } from '../theme/motion';
import { colors, font, radius, space, type } from '../theme/tokens';
import { CATEGORY_LABEL, Member } from '../types';

export function PlaceDetailScreen({ id, onClose }: { id: string; onClose: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  useDevScrollEnd(scrollRef);
  const {
    stash, memberById, currentUserId, toggleInterest, startCaper, addTake, updateTake, deleteTake, removeFromStash, caperByPlace,
  } = useStash();
  const reduce = useReduceMotion();
  const safetyMenu = useSafetyMenu();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const item = stash.find(s => s.id === id);
  if (!item) {
    return (
      <SheetModal onClose={onClose} height={0.42}>
        <EmptyState line={lines.missingEvent} />
      </SheetModal>
    );
  }

  const savedBy = memberById.get(item.savedBy);
  /** The note's author, which isn't always the first saver. */
  const noteBy = item.noteBy ?? item.savedBy;
  const going = item.interested.map(u => memberById.get(u)).filter(Boolean) as Member[];
  const isIn = item.iWant;
  const mine = item.takes.find(t => t.userId === currentUserId);
  /** Show the field when the user is in and has no comment yet, or while editing their comment. */
  const showField = (isIn && !mine) || editing;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    tapImpact();
    if (editing) updateTake(item.id, text); else addTake(item.id, text);
    setDraft('');
    setEditing(false);
  };
  const startEdit = () => { setDraft(mine?.text ?? ''); setEditing(true); };
  const remove = () => {
    Alert.alert('Delete your comment?', undefined, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { setEditing(false); setDraft(''); deleteTake(item.id); } },
    ]);
  };

  const confirmRemove = () => {
    const others = (item.savers ?? [item.savedBy]).filter(u => u !== currentUserId);
    const friend = others.length ? memberById.get(others[0])?.displayName ?? 'a friend' : null;
    Alert.alert('Remove from your Stash?',
      friend ? `It stays in the Den for ${friend}, who saved it too.` : 'Its comments and plans go with it.', [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { onClose(); removeFromStash(item.id); } },
      ]);
  };

  return (
    <SheetModal onClose={onClose} height={0.88}>
      <ScrollView ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        alwaysBounceVertical
      >
        <Kicker>{dotted(item.neighbourhood, CATEGORY_LABEL[item.category])}</Kicker>
        <Text style={styles.title}>{item.name}</Text>
        {item.headline ? <Text style={styles.happening}>{item.headline}</Text> : null}
        <Text style={styles.where}>{dotted(item.address ?? item.neighbourhood, item.distance)}</Text>
        {item.when && eventLabel(item.when) ? (
          <Text style={styles.where}>{dotted(eventLabel(item.when), item.when.text !== eventLabel(item.when) ? item.when.text : null)}</Text>
        ) : null}

        <View style={{ height: space.lg }} />
        {/* Who saved it and when, as a sentence. Their note, if they left one, goes underneath. */}
        <View style={styles.saver}>
          {savedBy ? <CritterHead critter={savedBy.critter} size={40} /> : <View style={{ width: 40 }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.saverLine}>
              <Text style={styles.saverName}>{savedBy?.displayName ?? 'Someone'}</Text> stashed this {stashedWhen(item.savedAt)}
            </Text>
            {item.note ? (
              <Text style={styles.saverNote}>
                {/* The newest note can be a later saver's, so it's credited when it isn't the first saver's. */}
                {noteBy !== item.savedBy ? <Text style={styles.saverName}>{`${memberById.get(noteBy)?.displayName ?? 'Someone'}: `}</Text> : null}
                {item.note}
              </Text>
            ) : null}
            {item.note && noteBy !== currentUserId ? (
              <Text
                style={styles.saverReport}
                accessibilityRole="button"
                onPress={() => safetyMenu({ userId: noteBy, displayName: memberById.get(noteBy)?.displayName }, { commentOn: item.id, note: true })}
              >
                Report
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ height: 18 }} />
        <PrimaryButton
          label={isIn ? "You're in" : "I'm in"}
          onPress={() => toggleInterest(item.id)}
          leading={isIn ? <IconCheck size={18} color={colors.ink} /> : undefined}
          style={isIn ? { backgroundColor: colors.flareWash, shadowColor: colors.hairline } : undefined}
          labelColor={isIn ? colors.ink : undefined}
        />
        {/* Once anyone is in, everyone in the Den can make the plan from here. Making it counts as being in. */}
        {item.wantCount > 0 && !caperByPlace.has(item.placeId) ? (
          <View style={{ marginTop: space.sm }}>
            <PrimaryButton label="Make it a Caper" onPress={() => startCaper(item.id)} />
          </View>
        ) : null}
        {showField ? (
          <Animated.View entering={reduce ? undefined : FadeIn.duration(180).easing(EASE_OUT)} style={styles.lineWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              placeholder={editing ? 'Edit your comment' : 'Add a comment'}
              placeholderTextColor={colors.inkMuted}
              returnKeyType="send"
              autoFocus={editing}
              blurOnSubmit
              maxLength={140}
              style={styles.lineField}
            />
            {editing ? (
              <View style={styles.editActions}>
                <TextButton label="Cancel" onPress={() => { setEditing(false); setDraft(''); }} muted />
                <TextButton label="Save" onPress={submit} />
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        <View style={{ height: space.xl }} />
        <View style={styles.takesHead}>
          <Kicker>{`Comments · ${item.takes.length}`}</Kicker>
          {going.length > 0
            ? <CritterStack members={going} size={26} />
            : item.wantCount > 0 ? <Kicker>{`${item.wantCount} want to go`}</Kicker> : null}
        </View>
        {item.takes.length === 0 ? (
          <EmptyState line={lines.noTakes} />
        ) : (
          <View style={styles.takes}>
            {item.takes.map((t, i) => {
              const own = t.userId === currentUserId;
              return (
                <TakeCard
                  key={t.userId}
                  member={memberById.get(t.userId)}
                  text={t.text}
                  meta={ago(t.at)}
                  index={i + 1}
                  onEdit={own ? startEdit : undefined}
                  onDelete={own ? remove : undefined}
                  onReport={own ? undefined : () => safetyMenu({ userId: t.userId, displayName: memberById.get(t.userId)?.displayName }, { commentOn: item.id })}
                />
              );
            })}
          </View>
        )}

        <View style={{ height: 18 }} />
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label="Directions"
              onPress={() => Linking.openURL(`http://maps.apple.com/?daddr=${item.lat},${item.lng}`)}
              leading={<IconNav size={18} color={colors.inkSecondary} />}
            />
          </View>
          {item.sourceUrl ? (
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label="Original post"
                onPress={() => Linking.openURL(item.sourceUrl!)}
                leading={<IconExternal />}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* only the people who saved it can take it out */}
        {currentUserId && (item.savers ?? [item.savedBy]).includes(currentUserId) ? (
          <TextButton label="Remove from Stash" onPress={confirmRemove} muted />
        ) : null}
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: 6, paddingBottom: space.lg },
  title: { ...type.display, color: colors.ink, marginTop: 8 },
  where: { ...type.meta, fontSize: 14, color: colors.inkMuted, marginTop: 6 },
  saver: {
    flexDirection: 'row', gap: space.md, alignItems: 'center',
    backgroundColor: colors.paperSunk, borderRadius: radius.xl - 2,
    paddingVertical: 14, paddingLeft: 14, paddingRight: space.lg,
  },
  saverLine: { ...type.bodyMed, fontSize: 16, color: colors.inkSecondary },
  saverName: { fontFamily: font.bold, color: colors.ink },
  saverNote: { ...type.take, color: colors.ink, marginTop: 4 },
  saverReport: { ...type.meta, color: colors.inkSecondary, marginTop: 6, alignSelf: 'flex-start' },
  happening: { ...type.bodyMed, color: colors.ink, marginTop: 4 },
  lineWrap: { marginTop: space.sm },
  lineField: {
    height: 52, borderRadius: radius.lg, marginTop: space.sm,
    backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.hairline,
    paddingHorizontal: space.lg, ...type.bodyMed, color: colors.ink,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  takesHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md,
  },
  takes: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.md },
  footer: { paddingHorizontal: space.xl },
});
