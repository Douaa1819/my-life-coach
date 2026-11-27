import { useEffect } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { radius, timingTo, useTheme } from '@/design';

type ProgressBarProps = {
  /** Fraction between 0 and 1. Values outside the range are clamped. */
  value: number;
  label: string;
  height?: number;
  /** `success` is for completed work: a mint track with a green fill. */
  tone?: 'brand' | 'success';
};

export function ProgressBar({ value, label, height = 8, tone = 'brand' }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const percent = Math.round(clamped * 100);
  const isSuccess = tone === 'success';
  const fillColor = isSuccess ? colors.successFill : clamped === 1 ? colors.success : colors.brand;
  const trackColor = isSuccess ? colors.successContainer : colors.surfaceMuted;

  const progress = useSharedValue(clamped);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    progress.set(timingTo(clamped, 'moderate', 'standard'));
  }, [clamped, progress]);

  // Translating a full-width fill keeps its rounded end intact, unlike scaleX.
  const fillStyle = useAnimatedStyle(() => {
    const width = trackWidth.get();
    return {
      opacity: width > 0 ? 1 : 0,
      transform: [{ translateX: (progress.get() - 1) * width }],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    trackWidth.set(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessible
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      onLayout={onLayout}
      style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
  },
});
