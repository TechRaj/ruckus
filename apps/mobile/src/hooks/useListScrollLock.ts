/**
 * Lets the Places list scroll to a row while the sheet is below full height.
 * The sheet holds its list at the top until it is fully open and undoes any
 * other scroll, so a pin tap at peek or half could never bring its row into
 * view. This hands the sheet the offset to hold the list at instead.
 */
import { SCROLLABLE_STATUS, useBottomSheetInternal, useScrollEventsHandlersDefault } from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { makeMutable, scrollTo } from 'react-native-reanimated';

const NONE = -1;
/**
 * Each correction raises another scroll event. If the list cannot reach the
 * offset, say past its end, correcting without a limit hangs the app.
 */
const MOST_TRIES = 2;

/** The offset the list is held at below full height. Places is the only list that uses it. */
const target = makeMutable(NONE);
const tries = makeMutable(0);

export function holdListAt(offset: number | null) {
  tries.value = 0;
  target.value = offset ?? NONE;
}

export const useListScrollLock: typeof useScrollEventsHandlersDefault = (ref, offsetY) => {
  const base = useScrollEventsHandlersDefault(ref, offsetY);
  const { animatedScrollableStatus } = useBottomSheetInternal();
  const baseOnScroll = base.handleOnScroll;

  const handleOnScroll = useCallback<NonNullable<typeof baseOnScroll>>((event, context) => {
    'worklet';
    const held = animatedScrollableStatus.value === SCROLLABLE_STATUS.LOCKED;
    /** Once the list scrolls freely the offset is spent. */
    if (!held) target.value = NONE;
    if (!held || target.value === NONE) {
      baseOnScroll?.(event, context);
      return;
    }

    const y = event.contentOffset.y;
    if (Math.abs(y - target.value) > 1) {
      if (tries.value < MOST_TRIES) {
        tries.value += 1;
        // @ts-expect-error the library's ref type is wider than scrollTo accepts
        scrollTo(ref, 0, target.value, false);
      } else {
        /** The list settled somewhere else. Hold it there. */
        target.value = y;
      }
    }
    offsetY.value = target.value;
    /** The library types this context as never. Its end of drag handlers read these two fields. */
    const lock = context as { shouldLockInitialPosition: boolean; initialContentOffsetY: number };
    lock.shouldLockInitialPosition = true;
    lock.initialContentOffsetY = target.value;
  }, [ref, offsetY, baseOnScroll, animatedScrollableStatus]);

  return { ...base, handleOnScroll };
};
