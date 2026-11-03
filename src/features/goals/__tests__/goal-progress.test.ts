import { formatGoalHorizon, getGoalProgress } from '@/features/goals/goal-progress';
import { goalSchema } from '@/features/goals/goal.schema';

describe('getGoalProgress', () => {
  test('returns the share of completed milestones', () => {
    expect(getGoalProgress({ milestonesCompleted: 3, milestonesTotal: 12 })).toBe(0.25);
  });

  test('treats a goal without milestones as not started', () => {
    expect(getGoalProgress({ milestonesCompleted: 0, milestonesTotal: 0 })).toBe(0);
  });
});

describe('formatGoalHorizon', () => {
  test('uses readable labels', () => {
    expect(formatGoalHorizon('5_years')).toBe('5 years');
  });
});

describe('goalSchema', () => {
  test('rejects more completed milestones than planned', () => {
    const result = goalSchema.safeParse({
      id: 'goal-1',
      title: 'Run a 10 km race',
      horizon: '6_months',
      milestonesTotal: 2,
      milestonesCompleted: 3,
    });
    expect(result.success).toBe(false);
  });
});
