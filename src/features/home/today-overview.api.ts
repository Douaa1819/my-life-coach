import { sampleTodayOverview } from './sample/today-overview.sample';
import { type TodayOverview, todayOverviewSchema } from './today-overview.schema';

/** Drives the "Sample data" label on Home. Remove together with the sample file. */
export const TODAY_OVERVIEW_IS_SAMPLE = true;

/**
 * Returns sample data until the backend phase. The response is still validated
 * with the same schema the Supabase response will go through, so screens do not
 * change when the data source does.
 */
export async function getTodayOverview(): Promise<TodayOverview> {
  return todayOverviewSchema.parse(sampleTodayOverview);
}
