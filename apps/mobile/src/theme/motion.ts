/**
 * Easing curves, accessibility setting hooks and haptics. Reduce Motion must
 * disable every optional animation, and the app must stay usable without them.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/** The iOS drawer curve, as used by Ionic. */
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);
/** Ease-out for elements that enter or respond to a press. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Reads one boolean accessibility setting and subscribes to its changes. */
function useAccessibilitySetting(
  read: () => Promise<boolean>,
  event: 'reduceMotionChanged' | 'reduceTransparencyChanged',
) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    read().then(v => { if (live) setOn(v); });
    const sub = AccessibilityInfo.addEventListener(event, setOn);
    return () => { live = false; sub.remove(); };
  }, [read, event]);
  return on;
}

export const useReduceMotion = () =>
  useAccessibilitySetting(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged');

/** When Reduce Transparency is on, the sheet uses an opaque background. */
export const useReduceTransparency = () =>
  useAccessibilitySetting(AccessibilityInfo.isReduceTransparencyEnabled, 'reduceTransparencyChanged');

/** Haptic for a selection change, such as tapping a pin, a row or a filter chip. */
export const tapSelection = () => { Haptics.selectionAsync().catch(() => {}); };

/** Haptic for a press that commits an action. */
export const tapImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** Haptic for a successful save. */
export const tapSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
