/**
 * Add a place — the entry point the app was missing entirely (§13.2).
 *
 * Three sources on purpose. §6 flags App Store Guideline 4.2 as our most
 * likely blocker, and a single-source utility reads as an unofficial client;
 * a places app that accepts links reads as a places app. Manual entry is also
 * the honest answer for the withheld-location reels in §8.
 */
import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SecondaryButton } from '../components/Buttons';
import { Emblem } from '../components/Emblem';
import {
  IconChevronDown, IconLink, IconPen, IconSearch, PawPrint,
} from '../components/Icons';
import { Hint, keyboardDismissMode } from '../components/Chrome';
import { SheetModal } from '../components/SheetModal';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { colors, radius, space, type } from '../theme/tokens';

export function AddPlaceScreen({
  onClose, onResolve, onManual,
}: {
  onClose: () => void;
  onResolve: (url: string) => void;
  onManual: () => void;
}) {
  const { den } = useStash();
  const [url, setUrl] = useState('');

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  };

  return (
    <SheetModal onClose={onClose} height={0.62}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        alwaysBounceVertical
        contentContainerStyle={{ flexGrow: 1 }}
      >
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.title}>Add a place</Text>
          <Pressable style={styles.denPill} onPress={() => {}}>
            <Emblem name={den?.emblem ?? 'lantern'} size={20} />
            <Text style={styles.denName} numberOfLines={1}>{den?.name}</Text>
            <IconChevronDown size={14} />
          </Pressable>
        </View>

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
            onPress={() => (url.trim() ? onResolve(url.trim()) : paste())}
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

        <View style={{ gap: space.md }}>
          <SecondaryButton label="Search for a place" onPress={onManual} leading={<IconSearch size={20} color={colors.inkSecondary} />} />
          <SecondaryButton label="Type in the details" onPress={onManual} leading={<IconPen />} />
        </View>
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
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.displaySm, fontSize: 28, color: colors.ink, flex: 1 },
  denPill: {
    height: 38, borderRadius: 19, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingLeft: 7, paddingRight: 12, backgroundColor: colors.paperSunk,
    maxWidth: 190,
  },
  denName: { ...type.meta, color: colors.inkSecondary, flexShrink: 1 },
  linkRow: {
    marginTop: 20, height: 60, borderRadius: radius.lg,
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
