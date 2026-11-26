import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl } from 'react-native';

import { Screen } from '@/components/ui';
import { useTheme } from '@/design';
import { goalHrefs } from '@/features/goals/goal-routes';
import { useGoals } from '@/features/goals/use-goals';
import { useProfile } from '@/features/profile/use-profile';

import { CoachEntryCard } from './components/coach-entry-card';
import { GoalsPreview } from './components/goals-preview';
import { GoalsSummaryCard } from './components/goals-summary-card';
import { HomeHeader } from './components/home-header';
import { MissionsPlaceholder } from './components/missions-placeholder';
import { formatTodayLabel, getGreeting } from './greeting';

export function HomeScreen({ now = new Date() }: { now?: Date }) {
  const { colors } = useTheme();
  const profile = useProfile();
  const goals = useGoals();

  const counts = useMemo(() => {
    const list = goals.data ?? [];
    return {
      active: list.filter((goal) => goal.status === 'active').length,
      completed: list.filter((goal) => goal.status === 'completed').length,
    };
  }, [goals.data]);

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
      {goals.data && (
        <GoalsSummaryCard
          active={counts.active}
          completed={counts.completed}
          onPress={() => router.navigate('/goals')}
        />
      )}
      <MissionsPlaceholder />
      <CoachEntryCard onOpenCoach={() => router.navigate('/coach')} />
      <GoalsPreview
        goals={goals.data}
        isPending={goals.isPending}
        isError={goals.isError}
        error={goals.error}
        onSeeAll={() => router.navigate('/goals')}
        onOpenGoal={(goalId) => router.push(goalHrefs.detail(goalId))}
        onRetry={() => void goals.refetch()}
        onAdd={() => router.push(goalHrefs.create)}
      />
    </Screen>
  );
}
