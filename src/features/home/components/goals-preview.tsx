import { StyleSheet, View } from 'react-native';

import { EmptyState, SectionHeader } from '@/components/ui';
import { spacing } from '@/design';
import { GoalCard } from '@/features/goals/components/goal-card';
import { type Goal } from '@/features/goals/goal.schema';

type GoalsPreviewProps = {
  goals: readonly Goal[];
  onSeeAll: () => void;
};

export function GoalsPreview({ goals, onSeeAll }: GoalsPreviewProps) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Your focus goals" actionLabel="All goals" onActionPress={onSeeAll} />
      {goals.length === 0 ? (
        <EmptyState
          icon="goals"
          title="No goals yet"
          message="Set one goal for the next three months to get started."
        />
      ) : (
        <View style={styles.list}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
});
