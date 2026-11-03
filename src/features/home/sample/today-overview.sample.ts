import { type TodayOverview } from '../today-overview.schema';

/**
 * SAMPLE DATA. Not real user data and not from the backend.
 * Used until the goals and missions tables exist. Delete this file once
 * `getTodayOverview` reads from Supabase.
 */
export const sampleTodayOverview: TodayOverview = {
  firstName: 'Sara',
  streakDays: 6,
  coachSuggestion:
    'You skipped your evening review twice this week. Want to make it 5 minutes instead of 15?',
  focusGoals: [
    {
      id: 'sample-goal-1',
      title: 'Run a 10 km race',
      horizon: '6_months',
      milestonesTotal: 6,
      milestonesCompleted: 2,
    },
    {
      id: 'sample-goal-2',
      title: 'Save three months of rent',
      horizon: '1_year',
      milestonesTotal: 12,
      milestonesCompleted: 7,
    },
    {
      id: 'sample-goal-3',
      title: 'Read 12 non-fiction books',
      horizon: '1_year',
      milestonesTotal: 12,
      milestonesCompleted: 3,
    },
  ],
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
