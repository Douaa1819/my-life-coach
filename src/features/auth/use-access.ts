import { useProfile } from '@/features/profile/use-profile';

import { type Access, ONBOARDING_REQUIRED, resolveAccess } from './access';
import { useAuth } from './auth-provider';

export function useAccess(): Access {
  const { state } = useAuth();
  const needsProfile = ONBOARDING_REQUIRED && state.status === 'signedIn' && !state.isRecovery;
  const profile = useProfile({ enabled: needsProfile });
  // Only the signed-in user's own row decides where they go.
  const ownProfile = profile.data?.id === state.session?.user.id ? profile.data : undefined;

  return resolveAccess({
    auth: state,
    onboardingCompleted: ownProfile?.onboardingCompleted,
    profileFailed: needsProfile && profile.isError,
  });
}
