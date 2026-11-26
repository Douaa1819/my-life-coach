import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import { spacing } from '@/design';

type GoalsSummaryCardProps = {
  active: number;
  completed: number;
  onPress: () => void;
};

export function GoalsSummaryCard({ active, completed, onPress }: GoalsSummaryCardProps) {
  const total = active + completed;
  const ratio = total === 0 ? 0 : completed / total;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Goals: ${active} in progress, ${completed} completed`}
      accessibilityHint="Opens your goals">
      <Text variant="label" color="textSecondary">
        Your goals
      </Text>
      <View style={styles.figures}>
        <Text variant="display">{active}</Text>
        <Text color="textSecondary">in progress · {completed} completed</Text>
      </View>
      <ProgressBar value={ratio} label="Goals completed" height={10} />
    </Card>
  );
}

const styles = StyleSheet.create({
  figures: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
