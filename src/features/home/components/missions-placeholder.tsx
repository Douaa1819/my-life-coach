import { View } from 'react-native';

import { Card, EmptyState, SectionHeader } from '@/components/ui';
import { spacing } from '@/design';

/** Daily missions and streaks are not built yet. This says so instead of showing made-up data. */
export function MissionsPlaceholder() {
  return (
    <View style={{ gap: spacing.xs }}>
      <SectionHeader title="Today's missions" />
      <Card padding="xxs">
        <EmptyState
          icon="check"
          title="Daily missions are coming soon"
          message="Missions and streaks aren't available yet. For now, focus on your goals."
        />
      </Card>
    </View>
  );
}
