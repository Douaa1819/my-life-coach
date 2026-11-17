import { sampleTodayOverview } from './sample/today-overview.sample';
import { type TodayOverview, todayOverviewSchema } from './today-overview.schema';

/** Drives the sample-missions label on Home. Remove together with the sample file. */
export const TODAY_OVERVIEW_IS_SAMPLE = true;

/**
 * Missions, streak and the coach line are still sample data.
 * Goals are loaded separately from Supabase.
 */
export async function getTodayOverview(): Promise<TodayOverview> {
  return todayOverviewSchema.parse(sampleTodayOverview);
}
