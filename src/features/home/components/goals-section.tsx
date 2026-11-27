import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, ProgressBar, SectionHeader, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';
import { formatGoalHorizon } from '@/features/goals/goal-progress';
import { goalCategoryLabels, type Goal } from '@/features/goals/goal.schema';

type GoalsSectionProps = {
  /** The other goals in focus (the lead goal is shown above, in the focus card). */
  goals: readonly Goal[];
  reached: number;
  total: number;
  onSeeAll: () => void;
  onOpenGoal: (goalId: string) => void;
  onAdd: () => void;
};

/** "Your goals": how many are reached, and the rest of the goals in focus. */
export function GoalsSection({
  goals,
  reached,
  total,
  onSeeAll,
  onOpenGoal,
  onAdd,
}: GoalsSectionProps) {
  const { colors } = useTheme();
  const label = `${reached} of ${total} ${total === 1 ? 'goal' : 'goals'} reached`;

  return (
    <View style={styles.section}>
      <SectionHeader title="Your goals" actionLabel="See all" onActionPress={onSeeAll} />
      <View style={styles.progress}>
        <View style={styles.bar}>
          <ProgressBar
            value={total === 0 ? 0 : reached / total}
            label={label}
            height={10}
            tone="success"
          />
        </View>
        <Text variant="bodySmall" style={{ color: colors.successText }}>
          {label}
        </Text>
      </View>

      <View style={styles.list}>
        {goals.map((goal) => (
          <Card
            key={goal.id}
            padding="md"
            onPress={() => onOpenGoal(goal.id)}
            accessibilityLabel={goal.title}
            accessibilityHint="Opens this goal">
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
                <Icon name={goal.category} size={22} color={colors.brand} />
              </View>
              <View style={styles.copy}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {goal.title}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {goalCategoryLabels[goal.category]} · {formatGoalHorizon(goal.horizon)}
                </Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textTertiary} />
            </View>
          </Card>
        ))}
        {goals.length === 0 && (
          <Button label="Add another goal" variant="tonal" icon="goals" onPress={onAdd} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    flex: 1,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
