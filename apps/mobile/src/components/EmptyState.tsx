/**
 * Shared empty state: a paw print, one line of text, and an optional action.
 * Use this on every screen so the spacing stays the same.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PawPrint } from './Icons';
import { colors, space, type } from '../theme/tokens';

export function EmptyState({
  line, action,
}: { line: string; action?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <PawPrint size={34} />
      <Text style={styles.line}>{line}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, padding: space.xl },
  line: { ...type.mascot, color: colors.inkSecondary, textAlign: 'center', maxWidth: 300 },
  action: { alignSelf: 'stretch', paddingTop: space.xs },
});
