import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Pebble } from '@/components/brand';
import { Button, Card, Screen, Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { goalHrefs } from '@/features/goals/goal-routes';
import { isFocusGoal } from '@/features/goals/goal-progress';
import { useGoals } from '@/features/goals/use-goals';
import { useProfile } from '@/features/profile/use-profile';
import { TasksSection } from '@/features/tasks/components/tasks-section';
import { localDateString } from '@/features/tasks/local-date';

import { FocusCard } from './components/focus-card';
import { GoalsSection } from './components/goals-section';
import { HomeHeader } from './components/home-header';
import { TodayEmpty, TodayError, TodaySkeleton } from './components/today-states';
import { formatTodayLabel, getGreeting } from './greeting';

const OTHER_GOALS_LIMIT = 3;

export function HomeScreen({ now = new Date() }: { now?: Date }) {
  const { colors } = useTheme();
  const profile = useProfile();
  const goals = useGoals();

  const summary = useMemo(() => {
    const counted = (goals.data ?? []).filter((goal) => goal.status !== 'archived');
    const inFocus = counted.filter(isFocusGoal);
    // An active goal leads; a paused one only if nothing is active.
    const lead = inFocus.find((goal) => goal.status === 'active') ?? inFocus[0];
    return {
      total: counted.length,
      reached: counted.filter((goal) => goal.status === 'completed').length,
      lead,
      others: inFocus.filter((goal) => goal !== lead).slice(0, OTHER_GOALS_LIMIT),
    };
  }, [goals.data]);

  const { lead } = summary;
  const addGoal = () => router.push(goalHrefs.create);

  let body;
  if (goals.isPending) {
    body = <TodaySkeleton />;
  } else if (goals.isError) {
    body = <TodayError onRetry={() => void goals.refetch()} />;
  } else if (summary.total === 0) {
    body = <TodayEmpty onAdd={addGoal} />;
  } else {
    body = (
      <>
        {lead ? (
          <FocusCard
            goal={lead}
            onOpenGoal={() => router.push(goalHrefs.detail(lead.id))}
            onOpenCoach={() => router.navigate('/coach')}
          />
        ) : (
          <Card tone="primary">
            <View style={styles.next}>
              <Pebble size={96} mood="proud" />
              <Text variant="title">Ready for the next one?</Text>
              <Text>Every goal on your list is reached or archived. Pick what comes next.</Text>
              <Button label="Add a goal" size="lg" fullWidth onPress={addGoal} />
            </View>
          </Card>
        )}
        <TasksSection
          taskDate={localDateString(now, profile.data?.timezone)}
          goals={goals.data ?? []}
          now={now.getTime()}
        />
        <GoalsSection
          goals={summary.others}
          reached={summary.reached}
          total={summary.total}
          onSeeAll={() => router.navigate('/goals')}
          onOpenGoal={(goalId) => router.push(goalHrefs.detail(goalId))}
          onAdd={addGoal}
        />
      </>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={goals.isRefetching}
          onRefresh={() => {
            void profile.refetch();
            void goals.refetch();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <HomeHeader
        greeting={getGreeting(now)}
        firstName={profile.data?.displayName ?? null}
        dateLabel={formatTodayLabel(now)}
      />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  next: {
    gap: spacing.md,
  },
});
