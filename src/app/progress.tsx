import { ComingSoonScreen } from '@/components/layout/coming-soon-screen';

export default function ProgressRoute() {
  return (
    <ComingSoonScreen
      title="Progress"
      icon="progress"
      showTitle={false}
      description="Weekly trends, streaks and reflections on how far you have come."
    />
  );
}
