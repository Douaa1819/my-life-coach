import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { layout, radius, spacing, useTheme } from '@/design';

import { formatDuration } from '../daily-progress';
import { type Mission } from '../mission.schema';

type MissionRowProps = {
  mission: Mission;
  onToggle: (missionId: string) => void;
};

export function MissionRow({ mission, onToggle }: MissionRowProps) {
  const { colors } = useTheme();
  const meta = [formatDuration(mission.durationMinutes), mission.goalTitle]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      role="checkbox"
      aria-checked={mission.isCompleted}
      aria-label={mission.title}
      accessibilityHint={
        mission.isCompleted ? 'Marks the mission as not done' : 'Marks the mission as done'
      }
      onPress={() => onToggle(mission.id)}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View
        style={[
          styles.check,
          mission.isCompleted
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { borderColor: colors.border },
        ]}>
        {mission.isCompleted && <Icon name="check" size={16} color={colors.onPrimary} />}
      </View>
      <View style={styles.copy}>
        <Text
          variant="bodyStrong"
          color={mission.isCompleted ? 'textSecondary' : 'text'}
          style={mission.isCompleted && styles.completedTitle}>
          {mission.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
});
