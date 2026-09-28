/**
 * Modal sheet over the map. It covers the tab bar and pads its bottom for
 * the home indicator. `SheetHost` owns the only Modal, and each screen's
 * `SheetModal` sets its height, so moving between screens resizes one sheet.
 * Dragging the sheet down closes it. The drag starts from the top of the
 * sheet, or from anywhere on a screen that does not scroll.
 */
import React, {
  createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, shadow } from '../theme/tokens';
import { EASE_DRAWER, EASE_OUT, useReduceMotion } from '../theme/motion';

interface Host {
  configure: (height: number, dismissable: boolean, dragAnywhere: boolean) => void;
  closeRef: React.MutableRefObject<() => void>;
}
const HostContext = createContext<Host | null>(null);

/** The exit is shorter than the entrance. */
const EXIT_MS = 240;
const RESIZE_MS = 260;
/** Height of the strip at the top of the sheet that always takes a drag. It covers the handle and the title. */
const GRAB = 96;
/** A drag this far, or a flick this fast, closes the sheet. Points, and points per second. */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 900;

export function SheetHost({
  open, contentKey, children,
}: {
  open: boolean;
  /** Changes when the screen inside changes, so the new one fades in. */
  contentKey: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(open);
  const [height, setHeight] = useState(0.8);
  const [dismissable, setDismissable] = useState(true);
  const [dragAnywhere, setDragAnywhere] = useState(false);
  const closeRef = useRef<() => void>(() => {});

  /** Key of the last screen shown. It keeps that screen mounted during the exit animation. */
  const lastKey = useRef(contentKey);
  if (open) lastKey.current = contentKey;

  const top = Math.max(insets.top + 8, screen * (1 - height));
  const progress = useSharedValue(0);
  const topValue = useSharedValue(top);
  /** How far the finger has pulled the sheet down. */
  const drag = useSharedValue(0);
  /** True once the open animation has finished. Before that, a height change sets the open position without animating. */
  const settled = useRef(false);
  /** Top of the content box. When the sheet gets shorter, the box shrinks after the sheet has finished moving. */
  const [boxTop, setBoxTop] = useState(top);

  useEffect(() => {
    if (reduce || !settled.current) {
      topValue.value = top;
      setBoxTop(top);
      return;
    }
    topValue.value = withTiming(top, { duration: RESIZE_MS, easing: EASE_OUT });
    setBoxTop(prev => Math.min(prev, top));
    const t = setTimeout(() => setBoxTop(top), RESIZE_MS);
    return () => clearTimeout(t);
  }, [top, reduce, topValue]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, { duration: reduce ? 1 : motion.sheet, easing: EASE_DRAWER });
      const t = setTimeout(() => { settled.current = true; }, reduce ? 1 : motion.sheet);
      return () => clearTimeout(t);
    }
    settled.current = false;
    /** Dismiss the keyboard first. Otherwise it stays up over the map after the sheet closes. */
    Keyboard.dismiss();
    progress.value = withTiming(0, { duration: reduce ? 1 : EXIT_MS, easing: EASE_OUT }, finished => {
      /** `finished` is false when the sheet reopens during the exit. In that case it stays mounted. */
      if (finished) runOnJS(setMounted)(false);
    });
  }, [open, reduce, progress, drag]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topValue.value + (1 - progress.value) * (screen - topValue.value) + drag.value }],
  }));
  /** The scrim reaches full opacity before the sheet finishes opening. */
  const scrimStyle = useAnimatedStyle(() => ({
    /** Fades as the sheet is pulled down, so the map shows through before it closes. */
    opacity: Math.min(1, progress.value * 1.6) * (1 - Math.min(0.6, drag.value / 400)),
  }));

  const host = useMemo<Host>(() => ({
    configure: (h, d, a) => { setHeight(h); setDismissable(d); setDragAnywhere(a); },
    closeRef,
  }), []);

  const close = () => { if (dismissable && open) closeRef.current(); };

  /**
   * Starts only on a downward drag, so taps and sideways swipes pass through.
   * A sheet that cannot be dismissed still gives a little, then returns.
   */
  const pan = Gesture.Pan()
    .enabled(open)
    .activeOffsetY(10)
    .failOffsetX([-24, 24])
    .hitSlop(dragAnywhere ? undefined : { top: 0, height: GRAB })
    .onUpdate(e => {
      const pulled = Math.max(0, e.translationY);
      drag.value = dismissable ? pulled : pulled * 0.2;
    })
    .onEnd(e => {
      if (dismissable && (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY)) {
        runOnJS(close)();
      } else {
        drag.value = withTiming(0, { duration: reduce ? 1 : 200, easing: EASE_OUT });
      }
    });

  if (!mounted) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      {/* Gestures inside a Modal need their own root view. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="Close"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, shadow.sheet, sheetStyle]}>
          <View style={{ height: screen - boxTop, paddingBottom: insets.bottom }}>
            <View style={styles.handle} />
            <HostContext.Provider value={host}>
              <Animated.View
                key={lastKey.current}
                entering={reduce ? undefined : FadeIn.duration(160).easing(EASE_OUT)}
                style={styles.content}
                /** Touches are disabled during the exit animation. */
                pointerEvents={open ? 'auto' : 'none'}
              >
                {children}
              </Animated.View>
            </HostContext.Provider>
          </View>
        </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function SheetModal({
  children, onClose, height = 0.8, dismissable = true, dragAnywhere = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  /** Fraction of the screen the sheet occupies. */
  height?: number;
  dismissable?: boolean;
  /** Lets a drag start anywhere on the sheet. Only for screens with nothing that scrolls. */
  dragAnywhere?: boolean;
}) {
  const host = useContext(HostContext);
  if (!host) throw new Error('SheetModal must be rendered inside SheetHost');

  host.closeRef.current = onClose;
  useLayoutEffect(() => {
    host.configure(height, dismissable, dragAnywhere);
  }, [host, height, dismissable, dragAnywhere]);

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  /** The sheet is full height and moved by transform, so a resize does not animate layout. */
  sheet: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
  },
  content: { flex: 1 },
  handle: {
    width: 44, height: 5, borderRadius: 3, backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: 10, marginBottom: 10,
  },
});
