import { StyleSheet, View } from 'react-native';

import { type ColorTokens, radius, useTheme } from '@/design';

type ProgressBarProps = {
  /** Fraction between 0 and 1. Values outside the range are clamped. */
  value: number;
  label: string;
  tone?: Extract<keyof ColorTokens, 'primary' | 'accent'>;
  height?: number;
};

export function ProgressBar({ value, label, tone = 'primary', height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const percent = Math.round(clamped * 100);

  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      style={[
        styles.track,
        { height, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
      ]}>
      <View
        style={[
          styles.fill,
          { width: `${percent}%`, borderRadius: radius.pill, backgroundColor: colors[tone] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
