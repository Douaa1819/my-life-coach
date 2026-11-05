import { memo, useEffect } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { radius, timingTo, useMotionPreference, useTheme } from '@/design';

type StepProgressProps = {
  /** 1-based current step; 0 before the first step. Clamped to `0…total`. */
  current: number;
  total: number;
  /** Names the bar for screen readers; the value is read as "Step 3 of 8". */
  label?: string;
};

const SEGMENT_HEIGHT = 4;
const SEGMENT_GAP = 4;

/**
 * Segmented step bar (docs/DESIGN_SYSTEM.md 5.5). Segments up to the current
 * step are filled; a change fills or empties only the segments in between.
 */
function StepProgressView({ current, total, label = 'Progress' }: StepProgressProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();
  const count = Math.max(1, Math.floor(total));
  const step = Number.isFinite(current) ? Math.min(Math.max(Math.round(current), 0), count) : 0;

  const progress = useSharedValue(step);
  const segmentWidth = useSharedValue(0);

  useEffect(() => {
    progress.set(reduceMotion ? step : timingTo(step, 'moderate', 'standard'));
  }, [step, reduceMotion, progress]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    segmentWidth.set(Math.max(0, (width - SEGMENT_GAP * (count - 1)) / count));
  };

  return (
    <View
      accessible
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of ${count}`}
      onLayout={onLayout}
      style={styles.bar}>
      {Array.from({ length: count }, (_, index) => (
        <Segment
          key={index}
          index={index}
          progress={progress}
          width={segmentWidth}
          fill={colors.brand}
          track={colors.surfaceMuted}
        />
      ))}
    </View>
  );
}

function Segment({
  index,
  progress,
  width,
  fill,
  track,
}: {
  index: number;
  progress: SharedValue<number>;
  width: SharedValue<number>;
  fill: string;
  track: string;
}) {
  // Same technique as ProgressBar: translating keeps the rounded end intact.
  const fillStyle = useAnimatedStyle(() => {
    const amount = Math.min(Math.max(progress.get() - index, 0), 1);
    const segment = width.get();
    return {
      opacity: segment > 0 ? 1 : 0,
      transform: [{ translateX: (amount - 1) * segment }],
    };
  });

  return (
    <View style={[styles.segment, { backgroundColor: track }]}>
      <Animated.View
        testID={`step-progress-fill-${index}`}
        style={[styles.fill, { backgroundColor: fill }, fillStyle]}
      />
    </View>
  );
}

export const StepProgress = memo(StepProgressView);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: SEGMENT_GAP,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
  },
});
