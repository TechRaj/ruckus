/**
 * Motion helpers — §11.3 and the design-engineering pass.
 *
 * Two rules this file exists to enforce:
 *   - Reduce Motion must disable every optional animation, and the app must
 *     stay fully usable with the playful layer removed.
 *   - Haptics are the one feedback channel a phone has that a browser doesn't.
 *     They are cheaper than an animation and read as more responsive.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/** The iOS drawer curve, by way of Ionic. Stronger than any built-in easing. */
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);
/** Strong ease-out for anything entering or responding to a press. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Subscribe to one boolean accessibility setting, current value first. */
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

/** Reduce Transparency swaps the glass sheet for opaque paper. */
export const useReduceTransparency = () =>
  useAccessibilitySetting(AccessibilityInfo.isReduceTransparencyEnabled, 'reduceTransparencyChanged');

/**
 * Selection changes — tapping a pin, a row, a filter chip. The lightest tap
 * iOS offers, and the right one for "something is now chosen".
 */
export const tapSelection = () => { Haptics.selectionAsync().catch(() => {}); };

/** A press that commits something. */
export const tapImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** The save landed. Used once, on the one screen where Rascal celebrates. */
export const tapSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
