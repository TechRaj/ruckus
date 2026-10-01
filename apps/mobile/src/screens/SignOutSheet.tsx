/**
 * Asks once before signing out. Staying is the primary action, because
 * signing back in means waiting for an emailed code.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Hint } from '../components/Chrome';
import { SheetModal } from '../components/SheetModal';
import { lines } from '../theme/lines';
import { Sprite } from '../components/Sprite';
import { lastEmail } from '../lib/lastSignIn';
import { useStash } from '../state/StashContext';
import { trashcan } from '../theme/sprites';
import { colors, font, space, type } from '../theme/tokens';

export function SignOutSheet({ onClose }: { onClose: () => void }) {
  const { signOut } = useStash();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    lastEmail().then(e => { if (live) setEmail(e); });
    return () => { live = false; };
  }, []);

  const leave = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    // Signing out needs the server, so offline it fails. Say so instead of doing nothing.
    try { await signOut(); } catch { setError(lines.signOutFailed); } finally { setBusy(false); }
  };

  return (
    <SheetModal onClose={onClose} height={0.545} dismissable={!busy} dragAnywhere>
      <View style={styles.body}>
        <Sprite sheet={trashcan} frame={8} width={196} style={styles.art} accessibilityLabel="Rascal peeking out of his trash can" />
        <Text style={styles.title}>Sign out?</Text>
        <Text style={styles.copy}>
          Your Dens and saved places stay put. Sign back in any time with{' '}
          {email ? <Text style={styles.email}>{email}</Text> : 'your email'}.
        </Text>
        {error ? <Hint style={styles.error}>{error}</Hint> : null}
        <View style={styles.gap} />
        <PrimaryButton label="Stay signed in" onPress={onClose} disabled={busy} />
        <TextButton label={busy ? 'Signing out…' : 'Sign out'} onPress={leave} danger />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl },
  /** The frame has empty room above the lid, so it is pulled up under the handle. */
  art: { alignSelf: 'center', marginTop: -44 },
  /** Takes whatever height is left, which is small: the sheet is sized to its content. */
  gap: { flex: 1, minHeight: space.lg },
  title: { ...type.displaySm, color: colors.ink, marginTop: space.xs },
  copy: { ...type.body, color: colors.inkSecondary, marginTop: 6 },
  email: { fontFamily: font.bold, color: colors.ink },
  error: { color: colors.warn, marginTop: space.md },
});
