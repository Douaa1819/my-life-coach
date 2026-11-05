import { type Href } from 'expo-router';

import { type AuthState } from './auth-state';

/**
 * Onboarding is routed but not built yet. Turn this on in the onboarding phase,
 * together with the server-side function that sets profiles.onboarding_completed.
 */
export const ONBOARDING_REQUIRED = false;

export type Access = 'loading' | 'signedOut' | 'recovery' | 'accountError' | 'onboarding' | 'app';

type AccessInput = {
  auth: Pick<AuthState, 'status' | 'isRecovery'>;
  /** The signed-in user's own profile value; undefined while it is loading or unavailable. */
  onboardingCompleted: boolean | undefined;
  /** The profile could not be loaded (network, missing row) and there is no copy to use. */
  profileFailed?: boolean;
  onboardingRequired?: boolean;
};

/** Decides which part of the navigation tree the user may see. */
export function resolveAccess({
  auth,
  onboardingCompleted,
  profileFailed = false,
  onboardingRequired = ONBOARDING_REQUIRED,
}: AccessInput): Access {
  if (auth.status === 'loading') return 'loading';
  if (auth.status === 'signedOut') return 'signedOut';
  if (auth.isRecovery) return 'recovery';
  if (!onboardingRequired) return 'app';
  if (onboardingCompleted !== undefined) return onboardingCompleted ? 'app' : 'onboarding';
  return profileFailed ? 'accountError' : 'loading';
}

/** Where a request for an app screen goes when the user may not see the app. */
export function getAppRedirect(access: Access): Href {
  if (access === 'onboarding') return '/onboarding';
  if (access === 'recovery') return '/reset-password';
  return '/welcome';
}
