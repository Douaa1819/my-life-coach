import { type ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { fadeTo, motion, timingTo, useMotionPreference } from '@/design';

type StepTransitionProps = {
  /** Increments on every navigation so a new move starts from the current values. */
  navigation: number;
  /** 1 when moving forward, -1 when moving back. */
  direction: 1 | -1;
  children: ReactNode;
};

/**
 * Only the question area moves (docs/MOTION_GUIDELINES.md 4.B): 24 dp slide + fade,
 * or a 160 ms crossfade under reduced motion. Header and bottom bar stay still.
 */
export function StepTransition({ navigation, direction, children }: StepTransitionProps) {
  const { reduceMotion } = useMotionPreference();
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      translateX.set(0);
      opacity.set(0);
      opacity.set(fadeTo(1, 'fast'));
      return;
    }

    opacity.set(0);
    translateX.set(direction * motion.distance.step);
    opacity.set(timingTo(1, 'base', 'decelerate'));
    translateX.set(timingTo(0, 'base', 'decelerate'));
  }, [navigation, direction, reduceMotion, opacity, translateX]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: translateX.get() }],
  }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
