import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';

import { getReminderPreferences, saveReminderPreferences } from './notifications.api';
import { type ReminderPreferences, type ReminderPreferencesInput } from './notification.schema';

export const notificationsQueryKeys = {
  preferences: (userId: string) => ['notification-preferences', userId] as const,
};

export function useReminderPreferences() {
  const user = useSessionUser();
  return useQuery({
    queryKey: notificationsQueryKeys.preferences(user?.id ?? 'signed-out'),
    queryFn: user ? getReminderPreferences : skipToken,
  });
}

export function useSaveReminderPreferences() {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReminderPreferencesInput) => {
      if (!user) throw new Error('Not signed in');
      return saveReminderPreferences(input);
    },
    onSuccess: (saved: ReminderPreferences) => {
      if (!user) return;
      queryClient.setQueryData(notificationsQueryKeys.preferences(user.id), saved);
    },
  });
}
