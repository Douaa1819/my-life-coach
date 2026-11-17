import { DataAccessError } from '@/lib/supabase/data-access-error';

import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
  updateGoalStatus,
} from '../goals.api';
import { goalRowFixture, validWriteInput } from './goal-fixtures';

const mockFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

function tableMock(result: { data: unknown; error: { code: string; message: string } | null }) {
  const query = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  query.order.mockResolvedValue(result);
  query.delete.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: result.data, error: result.error }),
    }),
  });
  mockFrom.mockReturnValue(query);
  return query;
}

describe('goals.api', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listGoals maps owned rows', async () => {
    tableMock({ data: [goalRowFixture()], error: null });
    await expect(listGoals()).resolves.toEqual([
      expect.objectContaining({ title: 'Run a 10 km race', userId: expect.any(String) }),
    ]);
    expect(mockFrom).toHaveBeenCalledWith('goals');
  });

  test('createGoal sends writable columns only', async () => {
    const query = tableMock({ data: goalRowFixture(), error: null });
    await createGoal(validWriteInput);
    expect(query.insert).toHaveBeenCalledWith({
      title: 'Run a 10 km race',
      description: 'More energy for my kids',
      category: 'health',
      horizon: '6_months',
      target_date: '2027-05-01',
      status: 'active',
    });
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty('user_id');
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty('completed_at');
  });

  test('createGoal rejects invalid input before calling the server', async () => {
    tableMock({ data: null, error: null });
    await expect(createGoal({ ...validWriteInput, title: 'ab' })).rejects.toBeInstanceOf(
      DataAccessError,
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('getGoal maps not-found errors', async () => {
    tableMock({ data: null, error: { code: 'PGRST116', message: 'JSON object requested' } });
    await expect(getGoal('missing')).rejects.toMatchObject({ kind: 'notFound' });
  });

  test('updateGoalStatus sends only the status', async () => {
    const query = tableMock({
      data: goalRowFixture({ status: 'completed', completed_at: '2026-11-13T12:00:00.000Z' }),
      error: null,
    });
    await updateGoalStatus('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'completed');
    expect(query.update).toHaveBeenCalledWith({ status: 'completed' });
  });

  test('updateGoal does not send user_id', async () => {
    const query = tableMock({ data: goalRowFixture({ title: 'Walk daily' }), error: null });
    await updateGoal('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
      ...validWriteInput,
      title: 'Walk daily',
    });
    expect(query.update.mock.calls[0][0]).not.toHaveProperty('user_id');
  });

  test('network failures stay generic', async () => {
    tableMock({ data: null, error: { code: '', message: 'TypeError: Network request failed' } });
    const error = await listGoals().catch((caught: unknown) => caught);
    expect(error).toMatchObject({ kind: 'network' });
    expect(JSON.stringify(error)).not.toContain('Network request failed');
  });

  test('deleteGoal reports database errors without schema text', async () => {
    tableMock({
      data: null,
      error: { code: '42501', message: 'permission denied for table goals' },
    });
    const error = await deleteGoal('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({ kind: 'forbidden' });
    expect(JSON.stringify(error)).not.toContain('goals');
  });

  test('deleteGoal treats a missing row as not found', async () => {
    tableMock({ data: [], error: null });
    await expect(deleteGoal('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).rejects.toMatchObject({
      kind: 'notFound',
    });
  });
});
