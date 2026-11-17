import { useLocalSearchParams } from 'expo-router';

import { ErrorState, Screen } from '@/components/ui';
import { GoalEditScreen } from '@/features/goals/screens/goal-edit-screen';

export default function EditGoalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || Array.isArray(id)) {
    return (
      <Screen scroll={false} topInset={false}>
        <ErrorState title="Goal not found" message="This goal is no longer available." />
      </Screen>
    );
  }
  return <GoalEditScreen goalId={id} />;
}
