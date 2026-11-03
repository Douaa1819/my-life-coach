import { ComingSoonScreen } from '@/components/layout/coming-soon-screen';

/** Reachable only when ONBOARDING_REQUIRED is on and the profile is not onboarded. */
export default function OnboardingRoute() {
  return (
    <ComingSoonScreen
      title="Welcome"
      icon="sparkle"
      description="A short questionnaire about your goals and routines will live here."
    />
  );
}
