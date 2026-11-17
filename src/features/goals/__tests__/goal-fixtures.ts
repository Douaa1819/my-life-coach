import { type Goal, type GoalWriteInput } from '../goal.schema';

export const USER_A = '11111111-1111-4111-8111-111111111111';

export function goalFixture(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: USER_A,
    title: 'Run a 10 km race',
    description: 'More energy for my kids',
    category: 'health',
    horizon: '6_months',
    status: 'active',
    targetDate: '2027-05-01',
    completedAt: null,
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
    ...overrides,
  };
}

export function goalRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    user_id: USER_A,
    title: 'Run a 10 km race',
    description: 'More energy for my kids',
    category: 'health',
    horizon: '6_months',
    status: 'active',
    target_date: '2027-05-01',
    completed_at: null,
    created_at: '2026-11-13T10:00:00.000Z',
    updated_at: '2026-11-13T10:00:00.000Z',
    ...overrides,
  };
}

export const validWriteInput: GoalWriteInput = {
  title: 'Run a 10 km race',
  description: 'More energy for my kids',
  category: 'health',
  horizon: '6_months',
  targetDate: '2027-05-01',
};
