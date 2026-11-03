import { z } from 'zod';

import { goalSchema } from '@/features/goals/goal.schema';
import { missionSchema } from '@/features/missions/mission.schema';

/** The user's name is not part of the overview: it comes from the profile. */
export const todayOverviewSchema = z.object({
  streakDays: z.number().int().min(0),
  focusGoals: z.array(goalSchema).max(5),
  missions: z.array(missionSchema).max(20),
  coachSuggestion: z.string().trim().min(1).max(200),
});

export type TodayOverview = z.infer<typeof todayOverviewSchema>;
