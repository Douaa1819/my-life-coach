import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Pebble } from '@/components/brand';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  InlineMessage,
  LoadingState,
  Screen,
  Text,
} from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { useGoals } from '@/features/goals/use-goals';
import { useXpTotals } from '@/features/tasks/use-tasks';
import { DataAccessError } from '@/lib/supabase/data-access-error';

import { AddHabitForm } from '../components/add-habit-form';
import { HabitCard } from '../components/habit-card';
import {
  useCheckHabit,
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useSetHabitActive,
  useUncheckHabit,
} from '../use-habits';

function loadMessage(error: unknown) {
  if (error instanceof DataAccessError && error.kind === 'network') {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "We couldn't load your habits. Your data is safe. Try again in a moment.";
}

/** Habits: small repeating routines with gentle, tolerant streaks. */
export function HabitsScreen() {
  const { colors } = useTheme();
  const habits = useHabits();
  const goals = useGoals();
  const xp = useXpTotals();
  const create = useCreateHabit();
  const check = useCheckHabit();
  const uncheck = useUncheckHabit();
  const setActive = useSetHabitActive();
  const remove = useDeleteHabit();
  const [adding, setAdding] = useState(false);

  if (habits.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your habits" />
      </Screen>
    );
  }

  if (habits.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message={loadMessage(habits.error)} onRetry={() => void habits.refetch()} />
      </Screen>
    );
  }

  const list = habits.data;
  const failed = check.isError || uncheck.isError || setActive.isError || remove.isError;
  const form = (
    <Card tone="muted">
      <AddHabitForm
        goals={goals.data ?? []}
        saving={create.isPending}
        errorMessage={create.isError ? "We couldn't add that habit. Please try again." : undefined}
        onCancel={() => setAdding(false)}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => {
              create.reset();
              setAdding(false);
            },
          })
        }
      />
    </Card>
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={habits.isRefetching}
          onRefresh={() => void habits.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <View style={styles.header}>
        <Text variant="title" role="heading">
          Habits
        </Text>
        {xp.data && xp.data.totalXp > 0 && (
          <Chip tone="success" label={`Level ${xp.data.level} · ${xp.data.totalXp} XP`} />
        )}
      </View>

      {list.length === 0 && !adding ? (
        <Card tone="primary">
          <View style={styles.empty}>
            <Pebble size={96} mood="encourage" />
            <Text variant="title" style={styles.center}>
              Small routines add up.
            </Text>
            <Text style={styles.center} color="textSecondary">
              Pick one thing you would like to do again and again. Rest days are built in.
            </Text>
            <Button label="Add your first habit" size="lg" onPress={() => setAdding(true)} />
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {list.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onCheck={(id) => check.mutate(id)}
              onUncheck={(id) => uncheck.mutate(id)}
              onToggleActive={(id, isActive) => setActive.mutate({ habitId: id, isActive })}
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
          {failed && (
            <InlineMessage tone="danger" message="That didn't go through. Please try again." />
          )}
          {adding ? (
            form
          ) : (
            <Button
              label="Add a habit"
              variant="tonal"
              icon="sparkle"
              onPress={() => setAdding(true)}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
