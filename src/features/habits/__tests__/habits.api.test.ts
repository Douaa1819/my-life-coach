import { checkHabit, createHabit, getHabitStreak, listHabits, uncheckHabit } from '../habits.api';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

const HABIT = '22222222-2222-4222-8222-222222222222';
const USER = '11111111-1111-4111-8111-111111111111';

function habitRow(overrides: Record<string, unknown> = {}) {
  return {
    id: HABIT,
    user_id: USER,
    goal_id: null,
    title: 'Read for ten minutes',
    cadence: 'daily',
    days_of_week: [],
    target_per_period: 1,
    rest_days_per_week: 1,
    is_active: true,
    created_at: '2026-11-28T08:00:00.000Z',
    updated_at: '2026-11-28T08:00:00.000Z',
    ...overrides,
  };
}

function table(result: { data: unknown; error: { code: string; message: string } | null }) {
  const query = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(query);
  return query;
}

const streak = {
  current: 3,
  best: 5,
  checked_today: true,
  days_since_last: 0,
  welcome_back: false,
};

describe('habits.api', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listHabits maps rows to camelCase', async () => {
    table({ data: [habitRow({ cadence: 'custom', days_of_week: [1, 3] })], error: null });
    await expect(listHabits()).resolves.toEqual([
      expect.objectContaining({
        title: 'Read for ten minutes',
        cadence: 'custom',
        daysOfWeek: [1, 3],
        restDaysPerWeek: 1,
      }),
    ]);
  });

  test('createHabit sends only the columns a client may write', async () => {
    const query = table({ data: habitRow(), error: null });
    await createHabit({
      title: ' Read for ten minutes ',
      cadence: 'daily',
      daysOfWeek: [],
      targetPerPeriod: 1,
      restDaysPerWeek: 1,
      goalId: null,
    });
    expect(query.insert).toHaveBeenCalledWith({
      title: 'Read for ten minutes',
      cadence: 'daily',
      days_of_week: [],
      target_per_period: 1,
      rest_days_per_week: 1,
      goal_id: null,
    });
  });

  test('createHabit refuses a custom habit with no days before calling the server', async () => {
    await expect(
      createHabit({
        title: 'Gym',
        cadence: 'custom',
        daysOfWeek: [],
        targetPerPeriod: 1,
        restDaysPerWeek: 1,
        goalId: null,
      }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('checkHabit returns the server XP and the streak it computed', async () => {
    mockRpc.mockResolvedValue({
      data: { xp_awarded: 5, total_xp: 25, level: 1, streak },
      error: null,
    });
    await expect(checkHabit(HABIT)).resolves.toEqual({
      xpAwarded: 5,
      totalXp: 25,
      level: 1,
      streak: { current: 3, best: 5, checkedToday: true, daysSinceLast: 0, welcomeBack: false },
    });
    expect(mockRpc).toHaveBeenCalledWith('check_habit', { p_habit_id: HABIT });
  });

  test('uncheckHabit and getHabitStreak call their server functions', async () => {
    mockRpc.mockResolvedValue({ data: { total_xp: 20, level: 1, streak }, error: null });
    await uncheckHabit(HABIT);
    expect(mockRpc).toHaveBeenCalledWith('uncheck_habit', { p_habit_id: HABIT });
    mockRpc.mockResolvedValue({ data: streak, error: null });
    await expect(getHabitStreak(HABIT)).resolves.toMatchObject({ current: 3, best: 5 });
    expect(mockRpc).toHaveBeenCalledWith('habit_streak', { p_habit_id: HABIT });
  });
});
