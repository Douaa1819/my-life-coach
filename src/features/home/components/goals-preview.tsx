import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { spacing } from '@/design';
import { GoalCard } from '@/features/goals/components/goal-card';
import { isFocusGoal } from '@/features/goals/goal-progress';
import { type Goal } from '@/features/goals/goal.schema';
import { goalLoadErrorMessage } from '@/features/goals/goal-errors';

type GoalsPreviewProps = {
  goals: readonly Goal[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onSeeAll: () => void;
  onOpenGoal: (goalId: string) => void;
  onRetry: () => void;
  onAdd: () => void;
};

const PREVIEW_LIMIT = 3;

export function GoalsPreview({
  goals,
  isPending,
  isError,
  error,
  onSeeAll,
  onOpenGoal,
  onRetry,
  onAdd,
}: GoalsPreviewProps) {
  const focusGoals = (goals ?? []).filter(isFocusGoal).slice(0, PREVIEW_LIMIT);

  return (
    <View style={styles.section}>
      <SectionHeader title="Your focus goals" actionLabel="All goals" onActionPress={onSeeAll} />
      {isPending ? (
        <LoadingState label="Loading your goals" />
      ) : isError ? (
        <ErrorState message={goalLoadErrorMessage(error)} onRetry={onRetry} />
      ) : focusGoals.length === 0 ? (
        <EmptyState
          icon="goals"
          title="No goals yet"
          message="Set one goal for the next season. Big or small, both work."
          action={{ label: 'Add a goal', onPress: onAdd }}
        />
      ) : (
        <View style={styles.list}>
          {focusGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onPress={() => onOpenGoal(goal.id)} />
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
