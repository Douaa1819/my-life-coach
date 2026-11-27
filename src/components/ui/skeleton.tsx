import { useEffect } from 'react';
import { type DimensionValue, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, useMotionPreference, useTheme } from '@/design';

type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  /** Corner radius. Defaults to a soft rounded line. */
  cornerRadius?: number;
  /** Tint of the block: `muted` for cards, `primary` on the lavender focus card. */
  tone?: 'muted' | 'primary';
};

const LOW = 0.55;
const CYCLE_MS = 700;

/**
 * A placeholder block that breathes between 55% and 100% opacity every 1.4 seconds.
 * Under reduced motion it stays still. Decorative: the screen that shows it carries
 * the loading label for screen readers.
 */
export function Skeleton({
  width = '100%',
  height,
  cornerRadius = 8,
  tone = 'muted',
}: SkeletonProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(
        withTiming(LOW, { duration: CYCLE_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      testID="skeleton"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: Math.min(cornerRadius, radius.pill),
          backgroundColor: tone === 'primary' ? colors.primaryBorder : colors.border,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
