/**
 * Development only. Lets a `ruckus://dev/...` link reach a mounted screen, so
 * a screen can be driven from the command line (`xcrun simctl openurl`)
 * without tapping through the app. Nothing subscribes in a release build.
 */
import { RefObject, useEffect } from 'react';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function devEmit(name: string) {
  for (const cb of listeners.get(name) ?? []) cb();
}

export function useDevSignal(name: string, cb: Listener) {
  useEffect(() => {
    if (!__DEV__) return;
    const set = listeners.get(name) ?? new Set<Listener>();
    listeners.set(name, set);
    set.add(cb);
    return () => { set.delete(cb); };
  });
}

/** `ruckus://dev/scroll-end` sends every mounted scroll view that uses this to its end. */
export function useDevScrollEnd(ref: RefObject<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>) {
  useDevSignal('scroll-end', () => ref.current?.scrollToEnd({ animated: false }));
}
