import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';

import {
  completeTask,
  createTask,
  deleteTask,
  getXpTotals,
  listTasks,
  skipTask,
  undoTask,
} from './tasks.api';
import { type Task, type TaskWriteInput, type XpResult } from './task.schema';

export const tasksQueryKeys = {
  day: (userId: string, date: string) => ['tasks', userId, date] as const,
  allDays: (userId: string) => ['tasks', userId] as const,
  xp: (userId: string) => ['xp', userId] as const,
};

export function useTasks(date: string | undefined) {
  const user = useSessionUser();
  return useQuery({
    queryKey: tasksQueryKeys.day(user?.id ?? 'signed-out', date ?? 'none'),
    queryFn: user && date ? () => listTasks(date) : skipToken,
  });
}

export function useXpTotals() {
  const user = useSessionUser();
  return useQuery({
    queryKey: tasksQueryKeys.xp(user?.id ?? 'signed-out'),
    queryFn: user ? getXpTotals : skipToken,
  });
}

export function useCreateTask() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskWriteInput) => {
      if (!user) throw new Error('Not signed in');
      return createTask(input);
    },
    onSuccess: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.allDays(user.id) });
    },
  });
}

function patchTask(tasks: Task[] | undefined, id: string, patch: Partial<Task>) {
  return tasks?.map((task) => (task.id === id ? { ...task, ...patch } : task));
}

/**
 * Completes a task. The checkbox flips at once and rolls back if the server says no; the
 * XP shown always comes from the server's answer, never from a guess on the device.
 */
export function useCompleteTask(date: string | undefined) {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const key = tasksQueryKeys.day(user?.id ?? 'signed-out', date ?? 'none');

  return useMutation<XpResult, Error, string, { previous: Task[] | undefined }>({
    mutationFn: (taskId) => {
      if (!user) throw new Error('Not signed in');
      return completeTask(taskId);
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(
        key,
        patchTask(previous, taskId, { status: 'completed', completedAt: new Date().toISOString() }),
      );
      return { previous };
    },
    onError: (_error, _taskId, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.allDays(user.id) });
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.xp(user.id) });
    },
  });
}

export function useUndoTask() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => {
      if (!user) throw new Error('Not signed in');
      return undoTask(taskId);
    },
    onSettled: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.allDays(user.id) });
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.xp(user.id) });
    },
  });
}

export function useSkipTask() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => {
      if (!user) throw new Error('Not signed in');
      return skipTask(taskId);
    },
    onSettled: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.allDays(user.id) });
    },
  });
}

export function useDeleteTask() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => {
      if (!user) throw new Error('Not signed in');
      return deleteTask(taskId);
    },
    onSettled: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: tasksQueryKeys.allDays(user.id) });
    },
  });
}
