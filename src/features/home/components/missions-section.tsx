import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, SectionHeader } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { MissionRow } from '@/features/missions/components/mission-row';
import { type Mission } from '@/features/missions/mission.schema';

type MissionsSectionProps = {
  missions: readonly Mission[];
  onToggle: (missionId: string) => void;
  onSeeAll: () => void;
};

export function MissionsSection({ missions, onToggle, onSeeAll }: MissionsSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader title="Today's missions" actionLabel="See all" onActionPress={onSeeAll} />
      <Card padding="xxs">
        {missions.length === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            message="Your coach will suggest missions once your goals are set."
          />
        ) : (
          missions.map((mission, index) => (
            <View key={mission.id}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <MissionRow mission={mission} onToggle={onToggle} />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 26 + spacing.md,
  },
});
