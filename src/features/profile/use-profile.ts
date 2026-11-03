import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '@/features/auth/auth-provider';

import { getProfile, updateProfile } from './profile.api';
import { type Profile, type ProfileUpdateInput } from './profile.schema';

export const profileQueryKeys = {
  detail: (userId: string) => ['profile', userId] as const,
};

export function useProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useSessionUser();
  return useQuery({
    queryKey: profileQueryKeys.detail(user?.id ?? 'signed-out'),
    queryFn: user && enabled ? () => getProfile(user.id) : skipToken,
  });
}

export function useUpdateProfile() {
  const user = useSessionUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => {
      if (!user) throw new Error('Not signed in');
      return updateProfile(user.id, input);
    },
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileQueryKeys.detail(profile.id), profile);
    },
  });
}
