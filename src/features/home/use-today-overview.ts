import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getTodayOverview } from './today-overview.api';
import { type TodayOverview } from './today-overview.schema';

export const homeQueryKeys = {
  todayOverview: ['home', 'today-overview'] as const,
};

export function useTodayOverview() {
  return useQuery({
    queryKey: homeQueryKeys.todayOverview,
    queryFn: getTodayOverview,
  });
}

/**
 * Local-only toggle on the cached sample data. It persists nothing and awards
 * nothing. The backend phase replaces it with an authorized mutation.
 */
export function useToggleMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (missionId: string) => missionId,
    onSuccess: (missionId) => {
      queryClient.setQueryData<TodayOverview>(homeQueryKeys.todayOverview, (overview) =>
        overview
          ? {
              ...overview,
              missions: overview.missions.map((mission) =>
                mission.id === missionId
                  ? { ...mission, isCompleted: !mission.isCompleted }
                  : mission,
              ),
            }
          : overview,
      );
    },
  });
}
