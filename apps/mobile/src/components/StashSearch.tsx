/**
 * Search your own Stash — name, neighbourhood, or the note.
 *
 * A control, so it stays Nunito rather than mono. Lives in the sheet at the
 * full detent only; BottomSheetTextInput registers with the sheet's keyboard
 * handling so the sheet extends rather than the list disappearing under the
 * keyboard. Composes with the person and category chips.
 */
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { IconClose, IconSearch } from './Icons';
import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from '../theme/tokens';

export function StashSearch({
  value, onChange, onFocus,
}: { value: string; onChange: (q: string) => void; onFocus?: () => void }) {
  return (
    <View style={styles.pill}>
      <IconSearch size={20} color={colors.inkMuted} />
      <BottomSheetTextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholder="Search your stash"
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel="Search your stash"
        style={styles.input}
      />
      {value.length > 0 ? (
        <PressableScale
          onPress={() => onChange('')}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}
        >
          <IconClose size={12} color={colors.inkSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginHorizontal: space.xl, marginTop: 6, marginBottom: space.md,
    height: 48, borderRadius: radius.pill, backgroundColor: colors.paperSunk,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: space.lg, paddingRight: 14,
  },
  input: { flex: 1, ...type.bodyMed, color: colors.ink, paddingVertical: 0 },
  clear: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
});
