import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';
import { tasksQueryKeys } from '@/features/tasks/use-tasks';

import {
  checkHabit,
  createHabit,
  deleteHabit,
  getHabitStreak,
  listHabits,
  setHabitActive,
  uncheckHabit,
} from './habits.api';
import { type HabitWriteInput } from './habit.schema';

export const habitsQueryKeys = {
  all: (userId: string) => ['habits', userId] as const,
  streak: (userId: string, habitId: string) => ['habits', userId, 'streak', habitId] as const,
};

export function useHabits() {
  const user = useSessionUser();
  return useQuery({
    queryKey: habitsQueryKeys.all(user?.id ?? 'signed-out'),
    queryFn: user ? listHabits : skipToken,
  });
}

export function useHabitStreak(habitId: string) {
  const user = useSessionUser();
  return useQuery({
    queryKey: habitsQueryKeys.streak(user?.id ?? 'signed-out', habitId),
    queryFn: user ? () => getHabitStreak(habitId) : skipToken,
  });
}

function useRefreshHabits() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return () => {
    if (!user) return;
    void queryClient.invalidateQueries({ queryKey: habitsQueryKeys.all(user.id) });
    // Checking in changes the XP the server holds.
    void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.xp(user.id) });
  };
}

export function useCreateHabit() {
  const user = useSessionUser();
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: (input: HabitWriteInput) => {
      if (!user) throw new Error('Not signed in');
      return createHabit(input);
    },
    onSuccess: refresh,
  });
}

export function useCheckHabit() {
  const user = useSessionUser();
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: (habitId: string) => {
      if (!user) throw new Error('Not signed in');
      return checkHabit(habitId);
    },
    onSettled: refresh,
  });
}

export function useUncheckHabit() {
  const user = useSessionUser();
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: (habitId: string) => {
      if (!user) throw new Error('Not signed in');
      return uncheckHabit(habitId);
    },
    onSettled: refresh,
  });
}

export function useSetHabitActive() {
  const user = useSessionUser();
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: ({ habitId, isActive }: { habitId: string; isActive: boolean }) => {
      if (!user) throw new Error('Not signed in');
      return setHabitActive(habitId, isActive);
    },
    onSettled: refresh,
  });
}

export function useDeleteHabit() {
  const user = useSessionUser();
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: (habitId: string) => {
      if (!user) throw new Error('Not signed in');
      return deleteHabit(habitId);
    },
    onSettled: refresh,
  });
}
