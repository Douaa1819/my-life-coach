import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl } from 'react-native';

import { Chip, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useTheme } from '@/design';
import { getDailyProgress } from '@/features/missions/daily-progress';
import { useProfile } from '@/features/profile/use-profile';

import { CoachEntryCard } from './components/coach-entry-card';
import { DailyProgressCard } from './components/daily-progress-card';
import { GoalsPreview } from './components/goals-preview';
import { HomeHeader } from './components/home-header';
import { MissionsSection } from './components/missions-section';
import { formatTodayLabel, getGreeting } from './greeting';
import { TODAY_OVERVIEW_IS_SAMPLE } from './today-overview.api';
import { useTodayOverview, useToggleMission } from './use-today-overview';

export function HomeScreen({ now = new Date() }: { now?: Date }) {
  const { colors } = useTheme();
  const overview = useTodayOverview();
  const profile = useProfile();
  const toggleMission = useToggleMission();

  const progress = useMemo(
    () => getDailyProgress(overview.data?.missions ?? []),
    [overview.data?.missions],
  );

  if (overview.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your day" />
      </Screen>
    );
  }

  if (overview.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message="We couldn't load today's plan. Check your connection and try again."
          onRetry={() => void overview.refetch()}
        />
      </Screen>
    );
  }

  const data = overview.data;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={overview.isRefetching}
          onRefresh={() => {
            void overview.refetch();
            void profile.refetch();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      {TODAY_OVERVIEW_IS_SAMPLE && <Chip label="Sample plan · not saved" />}
      <HomeHeader
        greeting={getGreeting(now)}
        firstName={profile.data?.displayName ?? null}
        dateLabel={formatTodayLabel(now)}
        streakDays={data.streakDays}
      />
      <DailyProgressCard progress={progress} onPress={() => router.push('/progress')} />
      <MissionsSection
        missions={data.missions}
        onToggle={(missionId) => toggleMission.mutate(missionId)}
        onSeeAll={() => router.push('/missions')}
      />
      <CoachEntryCard
        suggestion={data.coachSuggestion}
        onOpenCoach={() => router.navigate('/coach')}
      />
      <GoalsPreview goals={data.focusGoals} onSeeAll={() => router.navigate('/goals')} />
    </Screen>
  );
}
