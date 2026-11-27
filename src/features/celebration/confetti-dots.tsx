import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';

import { timingTo, useMotionPreference, useTheme } from '@/design';

/** Where each dot floats: position as a share of the box, size in dp, and its start delay. */
const DOTS = [
  { x: 0.08, y: 0.3, size: 8, delay: 0 },
  { x: 0.2, y: 0.08, size: 6, delay: 60 },
  { x: 0.82, y: 0.2, size: 7, delay: 30 },
  { x: 0.93, y: 0.42, size: 5, delay: 110 },
  { x: 0.14, y: 0.6, size: 5, delay: 90 },
  { x: 0.88, y: 0.66, size: 6, delay: 140 },
] as const;

function Dot({ x, y, size, delay, color }: (typeof DOTS)[number] & { color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(delay, timingTo(1, 'slow', 'decelerate')));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    // Fades in quickly, drifts upward, and is gone by the end: nothing is left behind.
    return {
      opacity: p < 0.25 ? p * 4 : 1 - (p - 0.25) / 0.75,
      transform: [{ translateY: -14 * p }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * A small, one-time burst of green dots around Pebble. It plays once, about half a second,
 * and is not rendered at all under reduced motion.
 */
export function ConfettiDots({ size }: { size: number }) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();
  if (reduceMotion) return null;

  return (
    <View
      testID="confetti"
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size }]}>
      {DOTS.map((dot) => (
        <Dot key={`${dot.x}-${dot.y}`} {...dot} color={colors.successFill} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
});
