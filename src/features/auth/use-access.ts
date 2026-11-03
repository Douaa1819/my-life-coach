import { useProfile } from '@/features/profile/use-profile';

import { type Access, ONBOARDING_REQUIRED, resolveAccess } from './access';
import { useAuth } from './auth-provider';

export function useAccess(): Access {
  const { state } = useAuth();
  const needsProfile = ONBOARDING_REQUIRED && state.status === 'signedIn' && !state.isRecovery;
  const profile = useProfile({ enabled: needsProfile });

  return resolveAccess({ auth: state, onboardingCompleted: profile.data?.onboardingCompleted });
}
