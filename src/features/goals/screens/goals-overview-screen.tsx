import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';

import { GoalCard } from '../components/goal-card';
import { GoalStatusFilter } from '../components/goal-status-filter';
import { formatGoalHorizon, groupGoalsByHorizon } from '../goal-progress';
import { goalHrefs } from '../goal-routes';
import { type GoalStatus } from '../goal.schema';
import { goalLoadErrorMessage } from '../goal-errors';
import { useGoals } from '../use-goals';

export function GoalsOverviewScreen() {
  const { colors } = useTheme();
  const goals = useGoals();
  const [status, setStatus] = useState<GoalStatus>('active');

  const visible = useMemo(
    () => (goals.data ?? []).filter((goal) => goal.status === status),
    [goals.data, status],
  );
  const grouped = useMemo(() => groupGoalsByHorizon(visible), [visible]);

  if (goals.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your goals" />
      </Screen>
    );
  }

  if (goals.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message={goalLoadErrorMessage(goals.error)}
          onRetry={() => void goals.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={goals.isRefetching}
          onRefresh={() => void goals.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text variant="title" role="heading">
            Goals
          </Text>
          <Text color="textSecondary">
            One thing at a time. You can change these whenever you like.
          </Text>
        </View>
        <Button label="Add a goal" onPress={() => router.push(goalHrefs.create)} />
      </View>

      <GoalStatusFilter value={status} onChange={setStatus} />

      {visible.length === 0 ? (
        <EmptyState
          icon="goals"
          title={emptyCopy[status].title}
          message={emptyCopy[status].message}
        />
      ) : (
        grouped.map((group) => (
          <View key={group.horizon} style={styles.group}>
            <Text variant="overline" color="textSecondary">
              {formatGoalHorizon(group.horizon)}
            </Text>
            {group.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => router.push(goalHrefs.detail(goal.id))}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const emptyCopy: Record<GoalStatus, { title: string; message: string }> = {
  active: {
    title: 'No goals yet',
    message:
      'Start with one thing you care about. Career, health, learning — whatever fits this season.',
  },
  paused: {
    title: 'Nothing on pause',
    message: 'When a goal needs to wait, you can pause it from its page.',
  },
  completed: {
    title: 'No reached goals yet',
    message: 'When you get there, it will live here so you can look back.',
  },
  archived: {
    title: 'Nothing archived',
    message: 'Put a goal away if it no longer fits. You can restore it later.',
  },
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  heading: {
    gap: spacing.xs,
  },
  group: {
    gap: spacing.sm,
  },
});
