/**
 * Add a place by pasted link or by search.
 * CLAUDE.md §7: keep more than one source, a single-source app risks App Store rejection under Guideline 4.2.
 */
import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SecondaryButton } from '../components/Buttons';
import { DenMenu, DenPill, useDenPicker } from '../components/DenPicker';
import { IconLink, IconSearch, PawPrint } from '../components/Icons';
import { Hint, keyboardDismissMode } from '../components/Chrome';
import { SheetModal } from '../components/SheetModal';
import { lines } from '../theme/lines';
import { playTap } from '../theme/sound';
import { colors, radius, space, type } from '../theme/tokens';

export function AddPlaceScreen({
  onClose, onResolve, onManual,
}: {
  onClose: () => void;
  onResolve: (url: string) => void;
  onManual: () => void;
}) {
  const [url, setUrl] = useState('');
  const picker = useDenPicker();

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  };

  return (
    <SheetModal onClose={onClose} height={0.59}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        alwaysBounceVertical
        contentContainerStyle={{ flexGrow: 1 }}
      >
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.title}>Add a place</Text>
          <DenPill {...picker} />
        </View>
        <View style={styles.menu}><DenMenu {...picker} /></View>

        <View style={styles.linkRow}>
          <IconLink />
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="Paste a link"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => url.trim() && onResolve(url.trim())}
            style={styles.input}
          />
          <Pressable
            onPress={() => { playTap(); url.trim() ? onResolve(url.trim()) : paste(); }}
            style={({ pressed }) => [styles.paste, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.pasteLabel}>{url.trim() ? 'Go' : 'Paste'}</Text>
          </Pressable>
        </View>

        <View style={styles.orRow}>
          <View style={styles.rule} />
          <Text style={styles.or}>or</Text>
          <View style={styles.rule} />
        </View>

        <SecondaryButton label="Search for a place" onPress={onManual} leading={<IconSearch size={20} color={colors.inkSecondary} />} />
      </View>

      <View style={styles.footnote}>
        <PawPrint size={28} />
        <Hint style={{ flex: 1 }}>{lines.hint.pasteLink}</Hint>
      </View>
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  menu: { marginTop: space.sm },
  /** Baloo 2 clips the tops of letters when lineHeight is under about 1.3 times fontSize. */
  title: { ...type.displaySm, fontSize: 28, lineHeight: 38, color: colors.ink, flex: 1 },
  linkRow: {
    marginTop: space.md, height: 60, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingLeft: space.lg, paddingRight: 10,
  },
  input: { flex: 1, ...type.body, color: colors.ink },
  paste: {
    height: 40, borderRadius: 20, paddingHorizontal: space.lg,
    backgroundColor: colors.paperSunk, alignItems: 'center', justifyContent: 'center',
  },
  pasteLabel: { ...type.chip, fontSize: 14, color: colors.ink },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 18 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  or: { ...type.meta, color: colors.inkMuted },
  footnote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    paddingHorizontal: space.xl, paddingBottom: 6,
  },
});
