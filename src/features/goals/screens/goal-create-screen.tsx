import { router } from 'expo-router';

import { GoalForm } from '../components/goal-form';
import { goalSaveErrorMessage } from '../goal-errors';
import { goalHrefs } from '../goal-routes';
import { useCreateGoal } from '../use-goals';

export function GoalCreateScreen() {
  const create = useCreateGoal();

  return (
    <GoalForm
      submitLabel="Save goal"
      submitting={create.isPending}
      errorMessage={create.isError ? goalSaveErrorMessage(create.error) : null}
      onSubmit={(input) => {
        create.mutate(input, {
          onSuccess: (goal) => router.replace(goalHrefs.detail(goal.id)),
        });
      }}
    />
  );
}
