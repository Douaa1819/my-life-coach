import { useLocalSearchParams } from 'expo-router';

import { ErrorState, Screen } from '@/components/ui';
import { GoalDetailScreen } from '@/features/goals/screens/goal-detail-screen';

export default function GoalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || Array.isArray(id)) {
    return (
      <Screen scroll={false} topInset={false}>
        <ErrorState title="Goal not found" message="This goal is no longer available." />
      </Screen>
    );
  }
  return <GoalDetailScreen goalId={id} />;
}
