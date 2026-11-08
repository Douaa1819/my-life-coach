import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Pebble, type PebbleMood } from '@/components/brand';
import { Icon } from '@/components/ui';
import { motion, useMotionPreference, useTheme } from '@/design';

type PebbleStageProps = {
  size?: number;
  mood?: PebbleMood;
  spark?: boolean;
  blinkAfter?: number;
  /** Dotted path from Pebble toward a small flag (intro and completion). */
  showPath?: boolean;
  /** Stagger the path dots for the completion celebration. */
  celebratePath?: boolean;
};

const DOTS = 5;

/**
 * Pebble on the lavender blob, with an optional dotted path
 * (docs/DESIGN_SYSTEM.md 6.1, docs/ONBOARDING_UX_SPEC.md 4).
 */
export function PebbleStage({
  size = 160,
  mood = 'idle',
  spark = false,
  blinkAfter,
  showPath = false,
  celebratePath = false,
}: PebbleStageProps) {
  const { colors } = useTheme();
  const blob = size * 1.15;

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.stage}>
      <View
        style={[
          styles.blob,
          {
            width: blob,
            height: blob * 0.72,
            borderRadius: blob,
            backgroundColor: colors.primaryContainer,
          },
        ]}
      />
      <Pebble size={size} mood={mood} spark={spark} blinkAfter={blinkAfter} />
      {showPath && <DottedPath celebrate={celebratePath} />}
    </View>
  );
}

function DottedPath({ celebrate }: { celebrate: boolean }) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();

  return (
    <View style={styles.path}>
      {Array.from({ length: DOTS }, (_, index) => (
        <PathDot
          key={index}
          color={colors.brand}
          delay={celebrate ? 320 + index * 40 : 0}
          animate={celebrate && !reduceMotion}
        />
      ))}
      <Icon name="goals" size={16} color={colors.brand} />
    </View>
  );
}

function PathDot({ color, delay, animate }: { color: string; delay: number; animate: boolean }) {
  const entering = animate
    ? FadeIn.duration(motion.duration.fast).delay(delay).reduceMotion(ReduceMotion.Never)
    : undefined;

  return <Animated.View entering={entering} style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 180,
  },
  blob: {
    position: 'absolute',
    bottom: 8,
  },
  path: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
