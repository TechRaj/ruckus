/**
 * Place detail — §13.2. Where "I'm in" lives, and the only route out to the
 * original post.
 *
 * The tank pass gives it a voice: the saver's note is the first card, then
 * every friend's one line ("vibe checks"), and "I'm in" can add yours. That
 * third line is the reason the app is not a bookmark folder, and until now
 * the detail screen was the one place it wasn't shown.
 *
 * §5.6: store the reel URL, never the reel. The pin deep-links out, so if the
 * creator deletes the post the link goes dark, which is correct behaviour and
 * avoids a takedown process. No oEmbed, no inline preview, no Meta app token.
 */
import { useState } from 'react';
import {
  Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Buttons';
import { Kicker } from '../components/Chrome';
import { CritterStack } from '../components/CritterHead';
import { EmptyState } from '../components/EmptyState';
import { IconCheck, IconExternal, IconNav } from '../components/Icons';
import { SheetModal } from '../components/SheetModal';
import { TakeCard } from '../components/TakeCard';
import { ago } from '../lib/time';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { EASE_OUT, tapImpact, useReduceMotion } from '../theme/motion';
import { colors, radius, space, type } from '../theme/tokens';
import { CATEGORY_LABEL, Member } from '../types';

export function PlaceDetailScreen({ id, onClose }: { id: string; onClose: () => void }) {
  const {
    stash, memberById, currentUserId, toggleInterest, addTake, updateTake, deleteTake,
  } = useStash();
  const reduce = useReduceMotion();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const item = stash.find(s => s.id === id);
  if (!item) return null;

  const savedBy = memberById.get(item.savedBy);
  const going = item.interested.map(u => memberById.get(u)).filter(Boolean) as Member[];
  const isIn = item.interested.includes(currentUserId);
  const mine = item.takes.find(t => t.userId === currentUserId);
  /** The field shows once you're in and haven't commented, or while editing yours. */
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

  return (
    <SheetModal onClose={onClose} height={0.88}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Kicker>{`${item.neighbourhood} · ${CATEGORY_LABEL[item.category]}`}</Kicker>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.where}>{item.address ?? item.neighbourhood} · {item.distance}</Text>

        <View style={{ height: space.lg }} />
        <TakeCard member={savedBy} text={item.note} meta={`stashed it · ${ago(item.savedAt)}`} />

        <View style={{ height: 18 }} />
        <PrimaryButton
          label={isIn ? "You're in" : "I'm in"}
          onPress={() => toggleInterest(item.id)}
          leading={isIn ? <IconCheck size={18} color={colors.ink} /> : undefined}
          style={isIn ? { backgroundColor: colors.flareWash } : undefined}
        />
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
          {going.length > 0 ? <CritterStack members={going} size={26} /> : null}
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
        <TextButton label="Remove from Stash" onPress={onClose} muted />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: 6, paddingBottom: space.lg },
  title: { ...type.display, color: colors.ink, marginTop: 8 },
  where: { ...type.meta, fontSize: 14, color: colors.inkMuted, marginTop: 6 },
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
