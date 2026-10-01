/**
 * Signed in, but the Dens didn't load: usually no signal. The session is
 * fine, so this retries rather than signing anyone out. It also retries on
 * its own when the app comes back to the foreground.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { EmptyState } from '../components/EmptyState';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, space } from '../theme/tokens';

export function OfflineScreen() {
  const { refreshSession, signOut } = useStash();
  const [busy, setBusy] = useState(false);

  const retry = useCallback(async () => {
    setBusy(true);
    try { await refreshSession(); } finally { setBusy(false); }
  }, [refreshSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') retry(); });
    return () => sub.remove();
  }, [retry]);

  return (
    <View style={styles.root}>
      <EmptyState
        line={lines.offline}
        action={<PrimaryButton label="Try again" onPress={retry} loading={busy} disabled={busy} />}
      />
      {/* If it isn't the connection (an expired session, say), retrying never helps. */}
      <TextButton label="Sign out" onPress={() => { signOut().catch(() => {}); }} muted />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', paddingHorizontal: space.xl },
});
