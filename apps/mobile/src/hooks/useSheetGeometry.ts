/**
 * Every number the Places sheet and the things that ride on it depend on —
 * §4, corrected in §13.1. One seam: change a detent in `layout` and the snap
 * points, Rascal's perch, and the three drag-driven fades all move together.
 *
 * The detents resolve against the TAB SCREEN, and React Navigation has
 * already taken the tab bar out of that height. Subtracting a bottomInset
 * on the sheet as well would double-count it and float the sheet over a
 * strip of map — the mirror image of the original bug.
 *
 * Pixel snap points, not percentages: peek is measured to the sheet header
 * (at 18% it was a third taller than anything it had to show).
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Extrapolation, SharedValue, interpolate, useAnimatedStyle,
} from 'react-native-reanimated';
import { layout } from '../theme/tokens';

export function useSheetGeometry(animatedPosition: SharedValue<number>) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const geometry = useMemo(() => {
    const sheetHeight = windowHeight - (layout.tabBar + insets.bottom);
    return {
      insets,
      sheetHeight,
      snapPoints: [
        layout.sheetPeek,
        Math.round(sheetHeight * layout.sheetHalf),
        Math.round(sheetHeight * layout.sheetFull),
      ],
      /** Top edge of the sheet, in tab-screen pixels, at each detent. */
      peekTop: sheetHeight - layout.sheetPeek,
      halfTop: sheetHeight * (1 - layout.sheetHalf),
      fullTop: sheetHeight * (1 - layout.sheetFull),
      /** Room under the list for the FAB, plus the bar and home indicator in case
       *  the container runs under them — over-padding is only slack. */
      listPaddingBottom: layout.sheetPeek + layout.tabBar + insets.bottom,
    };
  }, [windowHeight, insets]);

  const { peekTop, halfTop, fullTop } = geometry;

  /**
   * Three fades driven from the sheet's own position on the UI thread, so
   * they track the finger rather than waiting for the animation to land.
   * Sorting is meaningless at peek; the hint is meaningless anywhere else;
   * search belongs to the full detent alone.
   */
  const sortStyle = useAnimatedStyle(() => {
    const t = interpolate(
      animatedPosition.value, [halfTop, peekTop - 40, peekTop], [1, 0, 0], Extrapolation.CLAMP,
    );
    return { opacity: t, transform: [{ scale: 0.94 + t * 0.06 }] };
  });
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedPosition.value, [halfTop + 60, peekTop - 20, peekTop], [0, 1, 1], Extrapolation.CLAMP,
    ),
  }));
  const searchStyle = useAnimatedStyle(() => {
    const t = interpolate(animatedPosition.value, [fullTop, fullTop + 80], [1, 0], Extrapolation.CLAMP);
    return { opacity: t, height: 66 * t, overflow: 'hidden' as const };
  });

  return { ...geometry, sortStyle, hintStyle, searchStyle };
}
