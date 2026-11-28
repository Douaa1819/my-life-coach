import { DataAccessError } from '@/lib/supabase/data-access-error';

import { completeTask, createTask, getXpTotals, listTasks, skipTask, undoTask } from '../tasks.api';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

const USER = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    user_id: USER,
    goal_id: null,
    plan_item_id: null,
    task_date: '2026-11-28',
    position: 1,
    title: 'Walk for 10 minutes',
    duration_minutes: 10,
    effort: 2,
    source: 'user',
    status: 'pending',
    completed_at: null,
    xp_awarded: 0,
    created_at: '2026-11-28T08:00:00.000Z',
    updated_at: '2026-11-28T08:00:00.000Z',
    ...overrides,
  };
}

function table(result: { data: unknown; error: { code: string; message: string } | null }) {
  const query = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(query);
  return query;
}

describe('tasks.api', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listTasks reads one day in order and maps rows', async () => {
    const query = table({ data: [taskRow()], error: null });
    await expect(listTasks('2026-11-28')).resolves.toEqual([
      expect.objectContaining({
        title: 'Walk for 10 minutes',
        durationMinutes: 10,
        status: 'pending',
      }),
    ]);
    expect(mockFrom).toHaveBeenCalledWith('tasks');
    expect(query.eq).toHaveBeenCalledWith('task_date', '2026-11-28');
  });

  test('createTask sends only the columns a client may write', async () => {
    const query = table({ data: taskRow(), error: null });
    await createTask({
      title: '  Walk for 10 minutes ',
      durationMinutes: 10,
      effort: 2,
      taskDate: '2026-11-28',
      goalId: null,
    });
    expect(query.insert).toHaveBeenCalledWith({
      title: 'Walk for 10 minutes',
      duration_minutes: 10,
      effort: 2,
      task_date: '2026-11-28',
      goal_id: null,
    });
  });

  test('createTask rejects an invalid step before calling the server', async () => {
    await expect(
      createTask({
        title: '   ',
        durationMinutes: 10,
        effort: 2,
        taskDate: '2026-11-28',
        goalId: null,
      }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('completeTask asks the server and returns its XP, never a guess', async () => {
    mockRpc.mockResolvedValue({ data: { xp_awarded: 20, total_xp: 50, level: 1 }, error: null });
    await expect(completeTask(TASK)).resolves.toEqual({ xpAwarded: 20, totalXp: 50, level: 1 });
    expect(mockRpc).toHaveBeenCalledWith('complete_task', { p_task_id: TASK });
  });

  test('undoTask returns the new totals', async () => {
    mockRpc.mockResolvedValue({ data: { total_xp: 30, level: 1 }, error: null });
    await expect(undoTask(TASK)).resolves.toEqual({ xpAwarded: 0, totalXp: 30, level: 1 });
    expect(mockRpc).toHaveBeenCalledWith('undo_task', { p_task_id: TASK });
  });

  test('a rule the server enforces becomes an invalid-data error without its message', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'task_not_pending' },
    });
    const failure = await completeTask(TASK).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(DataAccessError);
    expect(failure).toMatchObject({ kind: 'invalid', code: 'P0001' });
    expect(String((failure as Error).message)).not.toContain('task_not_pending');
  });

  test('skipTask calls the server function', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(skipTask(TASK)).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith('skip_task', { p_task_id: TASK });
  });

  test('getXpTotals maps the totals row, and a new person is level 1 with no XP', async () => {
    table({ data: { total_xp: 230, level: 2 }, error: null });
    await expect(getXpTotals()).resolves.toEqual({ totalXp: 230, level: 2 });
    table({ data: null, error: null });
    await expect(getXpTotals()).resolves.toEqual({ totalXp: 0, level: 1 });
  });
});
