/**
 * Report and block, from anywhere a Den-mate's name or words appear
 * (App Store guideline 1.2). One menu, so every entry point behaves the same.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';

export function useSafetyMenu() {
  const { report, block, currentUserId } = useStash();

  /** `displayName` is missing for someone who has left the Den; their words can still be reported. */
  return useCallback((member: { userId: string; displayName?: string }, opts: { commentOn?: string } = {}) => {
    if (member.userId === currentUserId) return;
    const name = member.displayName ?? 'Someone';
    const done = (p: Promise<void>, after?: string) =>
      p.then(() => { if (after) Alert.alert(after); }).catch(() => Alert.alert(lines.safety.failed));

    Alert.alert(name, undefined, [
      opts.commentOn
        ? { text: 'Report comment', onPress: () => done(report(member.userId, opts.commentOn), lines.safety.reported) }
        : { text: `Report ${name}`, onPress: () => done(report(member.userId), lines.safety.reported) },
      {
        text: `Block ${name}`, style: 'destructive', onPress: () =>
          Alert.alert(`Block ${name}?`, lines.safety.blockBody, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block', style: 'destructive', onPress: () => done(block(member.userId)) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [report, block, currentUserId]);
}
