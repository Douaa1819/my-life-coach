import { router } from 'expo-router';

import { ErrorState, LoadingState, Screen } from '@/components/ui';

import { GoalForm } from '../components/goal-form';
import { goalLoadErrorMessage, goalSaveErrorMessage } from '../goal-errors';
import { useGoal, useUpdateGoal } from '../use-goals';

export function GoalEditScreen({ goalId }: { goalId: string }) {
  const goal = useGoal(goalId);
  const update = useUpdateGoal(goalId);

  if (goal.isPending) {
    return (
      <Screen scroll={false} topInset={false}>
        <LoadingState label="Loading this goal" />
      </Screen>
    );
  }

  if (goal.isError || !goal.data) {
    return (
      <Screen scroll={false} topInset={false}>
        <ErrorState
          message={goalLoadErrorMessage(goal.error)}
          onRetry={() => void goal.refetch()}
        />
      </Screen>
    );
  }

  return (
    <GoalForm
      initial={goal.data}
      submitLabel="Save changes"
      submitting={update.isPending}
      errorMessage={update.isError ? goalSaveErrorMessage(update.error) : null}
      onSubmit={(input) => {
        update.mutate(input, {
          onSuccess: () => router.back(),
        });
      }}
    />
  );
}
