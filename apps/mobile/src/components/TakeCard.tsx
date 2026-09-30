/**
 * One member's comment about a place. The entrance animation is staggered
 * by `index`, 40ms per card.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { CritterHead } from './CritterHead';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { playTap } from '../theme/sound';
import { colors, radius, space, type } from '../theme/tokens';
import { Member } from '../types';

export function TakeCard({
  member, text, meta, index = 0, onEdit, onDelete, onReport,
}: {
  member: Member | undefined; text: string; meta: string; index?: number;
  /** Present only on the current user's own comment. */
  onEdit?: () => void; onDelete?: () => void;
  /** Present only on someone else's: opens report and block. */
  onReport?: () => void;
}) {
  const reduce = useReduceMotion();
  const opacity = useSharedValue(0);
  const rise = useSharedValue(reduce ? 0 : 6);

  useEffect(() => {
    const delay = index * 40;
    opacity.value = withDelay(delay, withTiming(1, { duration: 180, easing: EASE_OUT }));
    rise.value = withDelay(delay, withTiming(0, { duration: 180, easing: EASE_OUT }));
  }, [index, opacity, rise]);

  const enter = useAnimatedStyle(() => ({
    opacity: opacity.value, transform: [{ translateY: rise.value }],
  }));

  return (
    <Animated.View style={[styles.card, enter]}>
      {member ? <CritterHead critter={member.critter} size={36} /> : <View style={{ width: 36 }} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{text}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {(member?.displayName ?? 'someone').toUpperCase()} · {meta}
          </Text>
          {onEdit ? (
            <Pressable onPress={() => { playTap(); onEdit(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit your comment">
              <Text style={styles.action}>Edit</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable onPress={() => { playTap(); onDelete(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete your comment">
              <Text style={styles.action}>Delete</Text>
            </Pressable>
          ) : null}
          {onReport ? (
            <Pressable onPress={() => { playTap(); onReport(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Report or block ${member?.displayName ?? 'someone'}`}>
              <Text style={styles.action}>Report</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.paperSunk, borderRadius: radius.xl - 2,
    paddingVertical: 14, paddingLeft: 14, paddingRight: space.lg,
  },
  text: { ...type.take, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  meta: { ...type.kicker, fontSize: 12, letterSpacing: 0.7, color: colors.inkMuted, flex: 1 },
  action: { ...type.meta, color: colors.inkSecondary },
});
