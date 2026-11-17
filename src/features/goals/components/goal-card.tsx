import { StyleSheet, View } from 'react-native';

import { Card, Chip, Icon, Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';

import { formatGoalDeadline, formatGoalHorizon } from '../goal-progress';
import { goalCategoryLabels, type Goal } from '../goal.schema';

type GoalCardProps = {
  goal: Goal;
  onPress?: () => void;
};

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const { colors } = useTheme();
  const deadline = formatGoalDeadline(goal.targetDate, goal.status);
  const statusTone =
    goal.status === 'completed' ? 'success' : goal.status === 'paused' ? 'warning' : 'primary';

  return (
    <Card
      padding="md"
      onPress={onPress}
      accessibilityLabel={goal.title}
      accessibilityHint={onPress ? 'Opens this goal' : undefined}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
          <Icon name={goal.category} size={20} color={colors.brand} />
        </View>
        <View style={styles.copy}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {goal.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {goalCategoryLabels[goal.category]}
          </Text>
        </View>
        {onPress && <Icon name="chevronRight" size={20} color={colors.textTertiary} />}
      </View>
      <View style={styles.meta}>
        <Chip label={formatGoalHorizon(goal.horizon)} tone="primary" />
        {goal.status !== 'active' && (
          <Chip
            label={
              goal.status === 'completed'
                ? 'Reached'
                : goal.status === 'paused'
                  ? 'Paused'
                  : 'Archived'
            }
            tone={statusTone}
          />
        )}
      </View>
      {deadline && (
        <Text variant="caption" color="textSecondary" style={styles.deadline}>
          {deadline}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  deadline: {
    marginTop: spacing.xs,
  },
});
