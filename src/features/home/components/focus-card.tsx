import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/design';
import { formatGoalDeadline, formatGoalHorizon } from '@/features/goals/goal-progress';
import { goalCategoryLabels, type Goal } from '@/features/goals/goal.schema';

type FocusCardProps = {
  goal: Goal;
  onOpenGoal: () => void;
  onOpenCoach: () => void;
};

/** The one thing Today leads with: the goal in focus, and a single way to move it forward. */
export function FocusCard({ goal, onOpenGoal, onOpenCoach }: FocusCardProps) {
  const deadline = formatGoalDeadline(goal.targetDate, goal.status);
  const meta = [goalCategoryLabels[goal.category], formatGoalHorizon(goal.horizon), deadline]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.section}>
      <Text variant="overline" color="primary">
        Your focus
      </Text>
      <Card tone="primary">
        <View style={styles.body}>
          <Pressable
            role="button"
            aria-label={`${goal.title}. ${meta}`}
            accessibilityHint="Opens this goal"
            onPress={onOpenGoal}
            style={styles.copy}>
            <Text variant="title">{goal.title}</Text>
            <Text variant="bodySmall" color="onPrimaryContainer">
              {meta}
            </Text>
          </Pressable>
          <Text>Want to plan your first small step? Your coach can help you start.</Text>
          <Button label="Talk it through" icon="coach" size="lg" fullWidth onPress={onOpenCoach} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  body: {
    gap: spacing.md,
  },
  copy: {
    gap: spacing.xxs,
  },
});
