import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';

import {
  decideAdjustment,
  deleteCheckin,
  getCheckin,
  getWeeklyReview,
  saveCheckin,
} from './checkins.api';
import { type CheckinWriteInput } from './checkin.schema';

export const checkinsQueryKeys = {
  day: (userId: string, date: string) => ['checkins', userId, date] as const,
  allDays: (userId: string) => ['checkins', userId] as const,
  weekly: (userId: string) => ['weekly-review', userId] as const,
};

export function useTodayCheckin(localDate: string | undefined) {
  const user = useSessionUser();
  return useQuery({
    queryKey: checkinsQueryKeys.day(user?.id ?? 'signed-out', localDate ?? 'none'),
    queryFn: user && localDate ? () => getCheckin(localDate) : skipToken,
  });
}

export function useSaveCheckin() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckinWriteInput) => {
      if (!user) throw new Error('Not signed in');
      return saveCheckin(input);
    },
    onSuccess: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: checkinsQueryKeys.allDays(user.id) });
    },
  });
}

export function useDeleteCheckin() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!user) throw new Error('Not signed in');
      return deleteCheckin(id);
    },
    onSuccess: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: checkinsQueryKeys.allDays(user.id) });
    },
  });
}

/** Asks the server for last week's review (it builds it once and returns the same one after). */
export function useWeeklyReview() {
  const user = useSessionUser();
  return useQuery({
    queryKey: checkinsQueryKeys.weekly(user?.id ?? 'signed-out'),
    queryFn: user ? getWeeklyReview : skipToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDecideAdjustment() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => {
      if (!user) throw new Error('Not signed in');
      return decideAdjustment(id, accept);
    },
    onSuccess: () => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: checkinsQueryKeys.weekly(user.id) });
    },
  });
}
