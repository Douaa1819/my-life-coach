import { type Href } from 'expo-router';

import { type AuthState } from './auth-state';

/**
 * Onboarding is routed but not built yet. Turn this on in the onboarding phase,
 * together with the server-side function that sets profiles.onboarding_completed.
 */
export const ONBOARDING_REQUIRED = false;

export type Access = 'loading' | 'signedOut' | 'recovery' | 'onboarding' | 'app';

type AccessInput = {
  auth: Pick<AuthState, 'status' | 'isRecovery'>;
  /** Undefined while the profile is loading or unavailable. */
  onboardingCompleted: boolean | undefined;
  onboardingRequired?: boolean;
};

/** Decides which part of the navigation tree the user may see. */
export function resolveAccess({
  auth,
  onboardingCompleted,
  onboardingRequired = ONBOARDING_REQUIRED,
}: AccessInput): Access {
  if (auth.status === 'loading') return 'loading';
  if (auth.status === 'signedOut') return 'signedOut';
  if (auth.isRecovery) return 'recovery';
  if (!onboardingRequired) return 'app';
  if (onboardingCompleted === undefined) return 'loading';
  return onboardingCompleted ? 'app' : 'onboarding';
}

/** Where a request for an app screen goes when the user may not see the app. */
export function getAppRedirect(access: Access): Href {
  if (access === 'onboarding') return '/onboarding';
  if (access === 'recovery') return '/reset-password';
  return '/welcome';
}
