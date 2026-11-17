import { type TodayOverview } from '../today-overview.schema';

/**
 * SAMPLE DATA for missions, streak and the coach line only.
 * Goals are read from Supabase. Delete this file once missions exist.
 */
export const sampleTodayOverview: TodayOverview = {
  streakDays: 6,
  coachSuggestion:
    'You skipped your evening review twice this week. Want to make it 5 minutes instead of 15?',
  missions: [
    {
      id: 'sample-mission-1',
      title: 'Easy 25-minute run',
      goalTitle: 'Run a 10 km race',
      durationMinutes: 25,
      isCompleted: true,
    },
    {
      id: 'sample-mission-2',
      title: 'Move 50 € to savings',
      goalTitle: 'Save three months of rent',
      durationMinutes: 5,
      isCompleted: false,
    },
    {
      id: 'sample-mission-3',
      title: 'Read 20 pages before bed',
      goalTitle: 'Read 12 non-fiction books',
      durationMinutes: 30,
      isCompleted: false,
    },
    {
      id: 'sample-mission-4',
      title: 'Evening review: one win, one lesson',
      goalTitle: null,
      durationMinutes: 5,
      isCompleted: false,
    },
  ],
};
