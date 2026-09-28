/**
 * Snap points and drag-driven fades for the Places sheet, derived from
 * `layout`. The tab screen's height already excludes the tab bar, so do not
 * also set a bottom inset on the sheet. Peek is a pixel height that matches
 * the sheet header.
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
      /** Space under the list for the FAB, plus the tab bar and home indicator in
       *  case the container extends under them. */
      listPaddingBottom: layout.sheetPeek + layout.tabBar + insets.bottom,
    };
  }, [windowHeight, insets]);

  const { peekTop, halfTop, fullTop } = geometry;

  /**
   * These fades read the sheet position on the UI thread, so they follow the
   * drag. The sort control hides at peek, the hint shows only at peek, and
   * search shows only at full.
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

  /** Fades out the controls over the map as the sheet approaches full height. */
  const overMapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedPosition.value, [fullTop + 40, fullTop + 160], [0, 1], Extrapolation.CLAMP),
  }));

  return { ...geometry, sortStyle, hintStyle, searchStyle, overMapStyle };
}
