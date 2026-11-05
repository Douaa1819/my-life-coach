import { type ReactNode } from 'react';

import { ErrorState, LoadingState } from '@/components/ui';
import { useSessionUser } from '@/features/auth/auth-provider';
import { useProfile } from '@/features/profile/use-profile';

import { type OnboardingDraftStore } from './onboarding-draft-store';
import { useOnboarding } from './use-onboarding';

export type Onboarding = ReturnType<typeof useOnboarding>;

type OnboardingGateProps = {
  children: (onboarding: Onboarding) => ReactNode;
  draftStore?: OnboardingDraftStore;
};

/**
 * Starts the questionnaire only for the signed-in user's own loaded profile,
 * and only once their draft has been read, so nothing editable shows early.
 */
export function OnboardingGate({ children, draftStore }: OnboardingGateProps) {
  const user = useSessionUser();
  const profile = useProfile();

  if (!user) return <LoadingState />;

  if (profile.data?.id !== user.id) {
    if (profile.isError && !profile.isFetching) {
      return (
        <ErrorState
          title="We couldn't load your account"
          message="Check your connection and try again."
          onRetry={() => void profile.refetch()}
        />
      );
    }
    return <LoadingState label="Loading your profile" />;
  }

  // The guard is about to open Home; never show the questions again.
  if (profile.data.onboardingCompleted) return <LoadingState />;

  return (
    <OnboardingSession
      key={user.id}
      userId={user.id}
      initialName={profile.data.displayName}
      draftStore={draftStore}>
      {children}
    </OnboardingSession>
  );
}

function OnboardingSession({
  userId,
  initialName,
  draftStore,
  children,
}: OnboardingGateProps & { userId: string; initialName: string }) {
  const onboarding = useOnboarding({ userId, initialName, draftStore });
  if (onboarding.isRestoring) return <LoadingState label="Getting things ready" />;
  return children(onboarding);
}
