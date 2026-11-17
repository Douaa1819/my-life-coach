import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';

import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
  updateGoalStatus,
} from './goals.api';
import { type Goal, type GoalStatus, type GoalWriteInput } from './goal.schema';

export const goalsQueryKeys = {
  all: (userId: string) => ['goals', userId] as const,
  detail: (userId: string, goalId: string) => ['goals', userId, goalId] as const,
};

export function useGoals() {
  const user = useSessionUser();
  return useQuery({
    queryKey: goalsQueryKeys.all(user?.id ?? 'signed-out'),
    queryFn: user ? listGoals : skipToken,
  });
}

export function useGoal(goalId: string | undefined) {
  const user = useSessionUser();
  return useQuery({
    queryKey: goalsQueryKeys.detail(user?.id ?? 'signed-out', goalId ?? 'missing'),
    queryFn: user && goalId ? () => getGoal(goalId) : skipToken,
  });
}

function useGoalMutation<Input>(mutationFn: (input: Input) => Promise<Goal>) {
  const user = useSessionUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => {
      if (!user) throw new Error('Not signed in');
      return mutationFn(input);
    },
    onSuccess: (goal) => {
      if (!user) return;
      queryClient.setQueryData(goalsQueryKeys.detail(user.id, goal.id), goal);
      void queryClient.invalidateQueries({ queryKey: goalsQueryKeys.all(user.id) });
    },
  });
}

export function useCreateGoal() {
  return useGoalMutation((input: GoalWriteInput) => createGoal(input));
}

export function useUpdateGoal(goalId: string) {
  return useGoalMutation((input: GoalWriteInput) => updateGoal(goalId, input));
}

export function useUpdateGoalStatus(goalId: string) {
  return useGoalMutation((status: GoalStatus) => updateGoalStatus(goalId, status));
}

export function useDeleteGoal(goalId: string) {
  const user = useSessionUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error('Not signed in');
      return deleteGoal(goalId);
    },
    onSuccess: () => {
      if (!user) return;
      queryClient.removeQueries({ queryKey: goalsQueryKeys.detail(user.id, goalId) });
      void queryClient.invalidateQueries({ queryKey: goalsQueryKeys.all(user.id) });
    },
  });
}
