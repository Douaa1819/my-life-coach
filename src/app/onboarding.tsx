import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { OnboardingFlowScreen } from '@/features/onboarding/screens/onboarding-flow-screen';

/** Reachable only when ONBOARDING_REQUIRED is on and the profile is not onboarded. */
export default function OnboardingRoute() {
  return (
    <OnboardingGate>
      {(onboarding) => <OnboardingFlowScreen onboarding={onboarding} />}
    </OnboardingGate>
  );
}
