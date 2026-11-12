import { sampleTodayOverview } from './sample/today-overview.sample';
import { type TodayOverview, todayOverviewSchema } from './today-overview.schema';

/** Drives the "Sample data" label on Home. Remove together with the sample file. */
export const TODAY_OVERVIEW_IS_SAMPLE = true;

/**
 * Returns sample data until the goals and missions screens read the database.
 * A minimal `goals` table exists for onboarding, but Home does not query it.
 * The sample is never written. The response is validated with the same schema
 * a Supabase response will use, so screens do not change when the source does.
 */
export async function getTodayOverview(): Promise<TodayOverview> {
  return todayOverviewSchema.parse(sampleTodayOverview);
}
