import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCheck, Card, Text } from '@/components/ui';
import { fontFamilies, radius, spacing, useTheme } from '@/design';

import { describeCadence, streakMessage } from '../habit-copy';
import { type Habit } from '../habit.schema';
import { useHabitStreak } from '../use-habits';

type HabitCardProps = {
  habit: Habit;
  onCheck: (habitId: string) => void;
  onUncheck: (habitId: string) => void;
  onToggleActive: (habitId: string, isActive: boolean) => void;
  onRemove: (habitId: string) => void;
};

/** One habit: today's check, its streak in kind words, and quiet pause and remove actions. */
export function HabitCard({ habit, onCheck, onUncheck, onToggleActive, onRemove }: HabitCardProps) {
  const { colors } = useTheme();
  const streak = useHabitStreak(habit.id);
  const checked = streak.data?.checkedToday ?? false;

  return (
    <Card padding="md" tone={habit.isActive ? 'surface' : 'muted'}>
      <View style={styles.row}>
        <AnimatedCheck
          checked={checked}
          label={habit.title}
          disabled={!habit.isActive || streak.isPending}
          onChange={(next) => (next ? onCheck(habit.id) : onUncheck(habit.id))}
        />
        <View style={styles.copy}>
          <Text variant="bodyStrong">{habit.title}</Text>
          <Text variant="caption" color="textSecondary">
            {describeCadence(habit)}
            {habit.isActive ? '' : ' · Paused'}
          </Text>
          {habit.isActive && streak.data && (
            <Text variant="bodySmall" style={{ color: colors.successText }}>
              {streakMessage(habit, streak.data)}
            </Text>
          )}
          <View style={styles.actions}>
            <TextAction
              label={habit.isActive ? 'Pause' : 'Resume'}
              onPress={() => onToggleActive(habit.id, !habit.isActive)}
            />
            <TextAction label="Remove" onPress={() => onRemove(habit.id)} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={styles.textAction}>
      <Text variant="bodySmall" style={{ color: colors.primary, fontFamily: fontFamilies.bold }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});
