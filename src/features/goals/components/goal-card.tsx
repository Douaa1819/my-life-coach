import { StyleSheet, View } from 'react-native';

import { Card, Chip, ProgressBar, Text } from '@/components/ui';
import { spacing } from '@/design';

import { formatGoalHorizon, getGoalProgress } from '../goal-progress';
import { type Goal } from '../goal.schema';

export function GoalCard({ goal }: { goal: Goal }) {
  const progress = getGoalProgress(goal);

  return (
    <Card padding="md">
      <View style={styles.header}>
        <Text variant="bodyStrong" style={styles.title}>
          {goal.title}
        </Text>
        <Chip label={formatGoalHorizon(goal.horizon)} tone="primary" />
      </View>
      <ProgressBar value={progress} label={`${goal.title} progress`} />
      <Text variant="caption" color="textSecondary" style={styles.meta}>
        {goal.milestonesCompleted} of {goal.milestonesTotal} milestones
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
  },
  meta: {
    marginTop: spacing.xs,
  },
});
