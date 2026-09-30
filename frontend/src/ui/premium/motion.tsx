import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * ============================================================================
 * PREMIUM LAYER — motion
 * ============================================================================
 *
 * Every animation here runs on the native driver (transform / opacity only),
 * so it costs the JS thread nothing once started — safe on a mid-range
 * Android. All of it switches off when the OS "Remove animations" /
 * "Reduce motion" setting is on, and under Jest (loops would keep the test
 * runner alive).
 */

const IS_TEST = (() => {
  try {
    const proc = (globalThis as any)?.process;
    return !!proc?.env?.JEST_WORKER_ID;
  } catch {
    return false;
  }
})();

/* ---- one shared reduce-motion subscription for the whole app ------------ */

let reduceMotionNow = IS_TEST;
let started = false;
const listeners = new Set<(v: boolean) => void>();

function publish(v: boolean) {
  reduceMotionNow = IS_TEST || !!v;
  listeners.forEach((l) => {
    try { l(reduceMotionNow); } catch { /* a listener never breaks the others */ }
  });
}

function startWatching() {
  if (started) return;
  started = true;
  try {
    if (typeof AccessibilityInfo?.isReduceMotionEnabled === 'function') {
      AccessibilityInfo.isReduceMotionEnabled().then(publish).catch(() => {});
    }
    if (typeof AccessibilityInfo?.addEventListener === 'function') {
      AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
    }
  } catch (err) {
    console.warn('Reduce-motion check safely caught:', err);
  }
}

/** True when the user asked the OS for less motion (or under Jest). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(reduceMotionNow);
  useEffect(() => {
    startWatching();
    listeners.add(setReduce);
    setReduce(reduceMotionNow);
    return () => { listeners.delete(setReduce); };
  }, []);
  return reduce;
}

/** Synchronous read — for code that starts an animation once. */
export const prefersReducedMotion = () => reduceMotionNow;

/**
 * A 0→1 value that loops forever (linear or ping-pong) while `enabled`.
 * Stopped on unmount and when motion is reduced.
 */
export function useLoop({
  duration, pingPong = false, enabled = true, delay = 0,
}: { duration: number; pingPong?: boolean; enabled?: boolean; delay?: number }) {
  const value = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!enabled || reduce) {
      value.stopAnimation();
      value.setValue(0);
      return undefined;
    }
    const ms = Math.max(200, Number(duration || 0));
    const anim = pingPong
      ? Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: ms / 2, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]))
      : Animated.loop(Animated.timing(value, { toValue: 1, duration: ms, delay, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [value, duration, pingPong, enabled, reduce, delay]);
  return value;
}

/* ---- entrance ----------------------------------------------------------- */

/**
 * Fade + slide up on mount. Stagger siblings with `delay` (≈ 60–80ms apart).
 * `scaleFrom` adds a small grow (illustrations).
 */
export function FadeInUp({
  children, delay = 0, distance = 18, duration = 440, scaleFrom, style, pointerEvents,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  scaleFrom?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}) {
  const skip = prefersReducedMotion();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) return undefined;
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    // Always land fully visible, even if the run is interrupted (a busy
    // mount on a slow phone, a navigation mid-animation).
    anim.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => { anim.stop(); v.setValue(1); };
    // Runs once: an entrance is a mount event, not a reaction to props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const transform: any[] = [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }];
  if (typeof scaleFrom === 'number') {
    transform.push({ scale: v.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) });
  }
  return (
    <Animated.View pointerEvents={pointerEvents} style={[style, { opacity: v, transform }]}>
      {children}
    </Animated.View>
  );
}

/* ---- press feedback ----------------------------------------------------- */

/**
 * A Pressable that springs to `scaleTo` (0.97) while held.
 * `style` = layout on the outer pressable (flex, margins);
 * `contentStyle` = the visual box that scales.
 */
export function PressableScale({
  children, style, contentStyle, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();
  };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={style}
      onPressIn={(e) => { if (!prefersReducedMotion()) springTo(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { springTo(1); onPressOut?.(e); }}
    >
      <Animated.View style={[contentStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
