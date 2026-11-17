import {
  formatGoalDeadline,
  formatGoalHorizon,
  groupGoalsByHorizon,
  horizonEndDate,
  isFocusGoal,
} from '@/features/goals/goal-progress';

import { goalFixture } from './goal-fixtures';

describe('formatGoalHorizon', () => {
  test('uses readable labels', () => {
    expect(formatGoalHorizon('5_years')).toBe('5 years');
  });
});

describe('horizonEndDate', () => {
  test('adds the horizon to the starting day', () => {
    expect(horizonEndDate('3_months', new Date(2026, 10, 13))).toBe('2027-02-13');
    expect(horizonEndDate('1_year', new Date(2026, 10, 13))).toBe('2027-11-13');
  });
});

describe('formatGoalDeadline', () => {
  const now = new Date(2026, 10, 13);

  test('returns nothing without a date', () => {
    expect(formatGoalDeadline(null, 'active', now)).toBeNull();
  });

  test('names today', () => {
    expect(formatGoalDeadline('2026-11-13', 'active', now)).toBe('Due today');
  });

  test('does not invent a completion percentage', () => {
    expect(formatGoalDeadline('2027-05-01', 'active', now)).toMatch(/^By /);
  });
});

describe('isFocusGoal', () => {
  test('keeps active and paused goals on Home', () => {
    expect(isFocusGoal(goalFixture({ status: 'active' }))).toBe(true);
    expect(isFocusGoal(goalFixture({ status: 'paused' }))).toBe(true);
    expect(isFocusGoal(goalFixture({ status: 'completed' }))).toBe(false);
    expect(isFocusGoal(goalFixture({ status: 'archived' }))).toBe(false);
  });
});

describe('groupGoalsByHorizon', () => {
  test('keeps horizon order and drops empty groups', () => {
    const groups = groupGoalsByHorizon([
      goalFixture({ id: '1', horizon: '1_year' }),
      goalFixture({ id: '2', horizon: '3_months' }),
    ]);
    expect(groups.map((group) => group.horizon)).toEqual(['3_months', '1_year']);
  });
});
