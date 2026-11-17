import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { layout, radius, spacing, useTheme } from '@/design';

import { goalStatusLabels, type GoalStatus } from '../goal.schema';

const filters = [
  'active',
  'paused',
  'completed',
  'archived',
] as const satisfies readonly GoalStatus[];

type GoalStatusFilterProps = {
  value: GoalStatus;
  onChange: (status: GoalStatus) => void;
};

export function GoalStatusFilter({ value, onChange }: GoalStatusFilterProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      role="tablist"
      aria-label="Goal status"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {filters.map((status) => {
        const selected = status === value;
        return (
          <Pressable
            key={status}
            role="tab"
            aria-selected={selected}
            onPress={() => onChange(status)}
            android_ripple={{ color: colors.ripple }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.surfaceMuted,
              },
            ]}>
            <Text
              variant="label"
              style={{ color: selected ? colors.onPrimary : colors.textSecondary }}>
              {goalStatusLabels[status]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
});
