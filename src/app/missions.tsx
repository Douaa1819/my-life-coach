import { ComingSoonScreen } from '@/components/layout/coming-soon-screen';

export default function MissionsRoute() {
  return (
    <ComingSoonScreen
      title="Today's missions"
      icon="check"
      showTitle={false}
      description="Your full list of daily missions, planned from your goals."
    />
  );
}
