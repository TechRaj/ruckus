/**
 * A modal sheet over the map. Covers the tab bar the way an iOS sheet does,
 * and pads its own bottom for the home indicator — the inset omission in
 * §13.1 was worst on screens like this, where a footer button sat under it.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, shadow } from '../theme/tokens';
import { EASE_OUT, useReduceMotion } from '../theme/motion';

export function SheetModal({
  children, onClose, height = 0.8, dismissable = true,
}: {
  children: React.ReactNode;
  onClose: () => void;
  /** Fraction of the screen the sheet occupies. */
  height?: number;
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const reduce = useReduceMotion();
  const top = Math.max(insets.top + 8, screen * (1 - height));

  /**
   * RN's `animationType="slide"` slides the whole modal, scrim included — a
   * dimming layer arriving from the bottom edge is physically wrong. The scrim
   * fades on its own, faster than the sheet it dims, so the sheet lands into
   * an already-dark screen rather than dragging the dark in with it.
   */
  const scrimOpacity = useSharedValue(0);
  useEffect(() => {
    scrimOpacity.value = reduce
      ? 1
      : withTiming(1, { duration: motion.scrim, easing: EASE_OUT });
  }, [reduce, scrimOpacity]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissable ? onClose : undefined}
            accessibilityLabel="Close"
          />
        </Animated.View>
        <View style={[styles.sheet, shadow.sheet, { top, paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  handle: {
    width: 44, height: 5, borderRadius: 3, backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: 10, marginBottom: 10,
  },
});
