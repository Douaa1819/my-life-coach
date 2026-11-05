import { useState } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from './tokens';

export type SpringName = keyof typeof motion.spring;
export type DurationName = keyof typeof motion.duration;
export type EasingName = keyof typeof motion.easing;

/**
 * Android "Remove animations" and iOS Reduce Motion. Reanimated reads the setting
 * once at app launch: a change while the app runs applies after a restart.
 */
export function useMotionPreference() {
  const reduceMotion = useReducedMotion();
  return { reduceMotion };
}

/** Movement: jumps to the end value under reduced motion. */
export function springTo(toValue: number, spring: SpringName = 'default') {
  'worklet';
  return withSpring(toValue, { ...motion.spring[spring], reduceMotion: ReduceMotion.System });
}

/** Movement: jumps to the end value under reduced motion. */
export function timingTo(
  toValue: number,
  duration: DurationName = 'base',
  easing: EasingName = 'standard',
) {
  'worklet';
  return withTiming(toValue, {
    duration: motion.duration[duration],
    easing: motion.easing[easing],
    reduceMotion: ReduceMotion.System,
  });
}

/** Opacity only: still fades under reduced motion, because the fade carries meaning. */
export function fadeTo(toValue: number, duration: DurationName = 'fast') {
  'worklet';
  return withTiming(toValue, {
    duration: motion.duration[duration],
    easing: motion.easing.standard,
    reduceMotion: ReduceMotion.Never,
  });
}

/**
 * Spring press feedback for buttons and cards. Under reduced motion the scale
 * stays at 1 and only the pressed color remains.
 */
export function usePressFeedback(pressedScale: number) {
  const { reduceMotion } = useMotionPreference();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return {
    pressed,
    animatedStyle,
    onPressIn: () => {
      setPressed(true);
      if (!reduceMotion) scale.set(springTo(pressedScale, 'press'));
    },
    onPressOut: () => {
      setPressed(false);
      scale.set(springTo(1, 'press'));
    },
  };
}
