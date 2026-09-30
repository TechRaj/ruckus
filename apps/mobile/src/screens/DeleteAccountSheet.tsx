/**
 * Deletes the account (App Store guideline 5.1.1(v)). Keeping it is the
 * primary action, and the delete asks a second time, because nothing brings
 * it back.
 */
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Hint } from '../components/Chrome';
import { SheetModal } from '../components/SheetModal';
import { Sprite } from '../components/Sprite';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { trashcan } from '../theme/sprites';
import { colors, space, type } from '../theme/tokens';

export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const { deleteAccount } = useStash();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      await deleteAccount();
    } catch {
      setError(lines.deleteAccount.failed);
      setBusy(false);
    }
  };

  const confirm = () => Alert.alert('Delete for good?', "This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: remove },
  ]);

  return (
    <SheetModal onClose={onClose} height={0.62} dismissable={!busy} dragAnywhere>
      <View style={styles.body}>
        <Sprite sheet={trashcan} frame={8} width={196} style={styles.art} accessibilityLabel="Rascal peeking out of his trash can" />
        <Text style={styles.title}>Delete your account?</Text>
        <Text style={styles.copy}>{lines.deleteAccount.body}</Text>
        <Text style={styles.copy}>{lines.deleteAccount.pro}</Text>
        {error ? <Hint style={styles.error}>{error}</Hint> : null}
        <View style={styles.gap} />
        <PrimaryButton label="Keep my account" onPress={onClose} disabled={busy} />
        <TextButton label={busy ? 'Deleting…' : 'Delete account'} onPress={busy ? () => {} : confirm} danger />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl },
  art: { alignSelf: 'center', marginTop: -44 },
  gap: { flex: 1, minHeight: space.lg },
  title: { ...type.displaySm, color: colors.ink, marginTop: space.xs },
  copy: { ...type.body, color: colors.inkSecondary, marginTop: 6 },
  error: { color: colors.warn, marginTop: space.md },
});
