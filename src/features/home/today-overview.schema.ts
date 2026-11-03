import { z } from 'zod';

import { goalSchema } from '@/features/goals/goal.schema';
import { missionSchema } from '@/features/missions/mission.schema';

export const todayOverviewSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  streakDays: z.number().int().min(0),
  focusGoals: z.array(goalSchema).max(5),
  missions: z.array(missionSchema).max(20),
  coachSuggestion: z.string().trim().min(1).max(200),
});

export type TodayOverview = z.infer<typeof todayOverviewSchema>;
