import { router } from 'expo-router';

import { goalHrefs } from '@/features/goals/goal-routes';
import { useGoals } from '@/features/goals/use-goals';

import { useCelebration } from './celebration-store';
import { GoalReachedSheet } from './goal-reached-sheet';

/**
 * Shows the "goal reached" sheet wherever the person is, once a goal has been marked reached.
 * Mounted once, next to the navigator.
 */
export function GoalReachedHost() {
  const goalTitle = useCelebration((state) => state.goalTitle);
  const dismiss = useCelebration((state) => state.dismiss);
  const goals = useGoals();

  if (!goalTitle) return null;

  const counted = (goals.data ?? []).filter((goal) => goal.status !== 'archived');
  const reached = counted.filter((goal) => goal.status === 'completed').length;

  return (
    <GoalReachedSheet
      goalTitle={goalTitle}
      reached={Math.max(reached, 1)}
      total={Math.max(counted.length, 1)}
      onDismiss={dismiss}
      onChooseNext={() => {
        dismiss();
        router.push(goalHrefs.create);
      }}
    />
  );
}
