/**
 * Shows the Den a place will be saved to, and switches Den when the person
 * is in more than one. With a single Den the pill is a label and cannot be
 * pressed. The list is laid out in the flow of the screen, not floated over
 * it, because iOS does not deliver touches to a view outside its parent.
 */
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Emblem } from './Emblem';
import { IconCheck, IconChevronDown } from './Icons';
import { PressableScale } from './PressableScale';
import { useStash } from '../state/StashContext';
import { EASE_OUT, useReduceMotion } from '../theme/motion';
import { colors, radius, space, type } from '../theme/tokens';

/** Open state shared by the pill and the list. */
export function useDenPicker() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
type Picker = ReturnType<typeof useDenPicker>;

export function DenPill({ open, setOpen }: Picker) {
  const { den, dens } = useStash();
  const many = dens.length > 1;
  if (!den) return null;
  return (
    <PressableScale
      onPress={() => setOpen(!open)}
      disabled={!many}
      haptic="selection"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={many ? `Saving to ${den.name}. Change Den` : `Saving to ${den.name}`}
      accessibilityState={{ expanded: open }}
      style={styles.pill}
    >
      <Emblem name={den.emblem} size={22} />
      <Text style={styles.name} numberOfLines={1}>{den.name}</Text>
      {many ? <IconChevronDown size={14} /> : null}
    </PressableScale>
  );
}

export function DenMenu({ open, setOpen }: Picker) {
  const { den, dens, switchDen } = useStash();
  const reduce = useReduceMotion();
  if (!open || !den) return null;
  return (
    <Animated.View
      entering={reduce ? undefined : FadeIn.duration(140).easing(EASE_OUT)}
      style={styles.menu}
    >
      {dens.map(d => {
        const on = d.id === den.id;
        return (
          <PressableScale
            key={d.id}
            onPress={() => { setOpen(false); switchDen(d.id); }}
            scaleTo={0.98}
            haptic="selection"
            accessibilityRole="menuitem"
            accessibilityState={{ selected: on }}
            style={[styles.row, on && styles.rowOn]}
          >
            <Emblem name={d.emblem} size={26} />
            <Text style={styles.rowName} numberOfLines={1}>{d.name}</Text>
            {on ? <IconCheck size={14} color={colors.onFlare} /> : null}
          </PressableScale>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 38, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center',
    gap: space.sm, paddingLeft: 7, paddingRight: space.md, maxWidth: 190, flexShrink: 1,
    backgroundColor: colors.paperSunk,
  },
  name: { ...type.meta, color: colors.inkSecondary, flexShrink: 1 },
  menu: {
    padding: 6, gap: 2, borderRadius: radius.lg,
    backgroundColor: colors.paperSunk, borderWidth: 1.5, borderColor: colors.hairline,
  },
  row: {
    height: 46, borderRadius: radius.lg - 6, paddingHorizontal: space.sm,
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
  },
  rowOn: { backgroundColor: colors.flareWash },
  rowName: { ...type.chip, color: colors.ink, flex: 1 },
});
