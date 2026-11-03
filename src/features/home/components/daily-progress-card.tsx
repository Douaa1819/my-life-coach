import { StyleSheet, View } from 'react-native';

import { Card, Icon, ProgressBar, Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { type DailyProgress, getProgressMessage } from '@/features/missions/daily-progress';

type DailyProgressCardProps = {
  progress: DailyProgress;
  onPress: () => void;
};

export function DailyProgressCard({ progress, onPress }: DailyProgressCardProps) {
  const { colors } = useTheme();
  const percent = Math.round(progress.ratio * 100);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Today's progress: ${progress.completed} of ${progress.total} missions done`}
      accessibilityHint="Opens your progress">
      <View style={styles.header}>
        <Text variant="label" color="textSecondary">
          Today&apos;s progress
        </Text>
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      </View>
      <View style={styles.figures}>
        <Text variant="display">{percent}%</Text>
        <Text color="textSecondary">
          {progress.completed} of {progress.total} missions
        </Text>
      </View>
      <ProgressBar value={progress.ratio} label="Missions completed today" height={10} />
      <Text variant="caption" color="textSecondary" style={styles.message}>
        {getProgressMessage(progress)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  figures: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  message: {
    marginTop: spacing.sm,
  },
});
