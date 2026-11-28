import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { HabitsScreen } from '../screens/habits-screen';

const mockCheck = jest.fn();
const mockUncheck = jest.fn();
const mockSetActive = jest.fn();
const mockRemove = jest.fn();
const mockCreate = jest.fn();
const mockRefetch = jest.fn();

let mockHabits: { data: unknown[] | undefined; isPending: boolean; isError: boolean };
let mockStreak: { data: unknown; isPending: boolean };

jest.mock('../use-habits', () => ({
  useHabits: () => ({ ...mockHabits, error: null, isRefetching: false, refetch: mockRefetch }),
  useHabitStreak: () => mockStreak,
  useCheckHabit: () => ({ mutate: mockCheck, isError: false }),
  useUncheckHabit: () => ({ mutate: mockUncheck, isError: false }),
  useSetHabitActive: () => ({ mutate: mockSetActive, isError: false }),
  useDeleteHabit: () => ({ mutate: mockRemove, isError: false }),
  useCreateHabit: () => ({
    mutate: mockCreate,
    isPending: false,
    isError: false,
    reset: jest.fn(),
  }),
}));
jest.mock('@/features/goals/use-goals', () => ({ useGoals: () => ({ data: [] }) }));
jest.mock('@/features/tasks/use-tasks', () => ({
  useXpTotals: () => ({ data: { totalXp: 45, level: 1 } }),
}));

function habit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'habit-1',
    userId: 'user-a',
    goalId: null,
    title: 'Read for ten minutes',
    cadence: 'daily',
    daysOfWeek: [],
    targetPerPeriod: 1,
    restDaysPerWeek: 1,
    isActive: true,
    createdAt: '2026-11-28T08:00:00.000Z',
    updatedAt: '2026-11-28T08:00:00.000Z',
    ...overrides,
  };
}

const streakData = (overrides: Record<string, unknown> = {}) => ({
  current: 3,
  best: 5,
  checkedToday: false,
  daysSinceLast: 1,
  welcomeBack: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHabits = { data: [], isPending: false, isError: false };
  mockStreak = { data: streakData(), isPending: false };
});

describe('HabitsScreen', () => {
  test('with no habits it invites the first one, with no made-up data', async () => {
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText('Small routines add up.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add your first habit' })).toBeOnTheScreen();
    expect(screen.queryByText(/in a row/)).toBeNull();
  });

  test('lists a habit with its cadence and a kind streak line', async () => {
    mockHabits = { data: [habit()], isPending: false, isError: false };
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText('Read for ten minutes')).toBeOnTheScreen();
    expect(screen.getByText('Every day')).toBeOnTheScreen();
    expect(screen.getByText('3 days in a row')).toBeOnTheScreen();
    expect(screen.getByText('Level 1 · 45 XP')).toBeOnTheScreen();
  });

  test('checking in asks the server; an already-checked habit can be unchecked', async () => {
    mockHabits = { data: [habit()], isPending: false, isError: false };
    const { unmount } = await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Read for ten minutes' }));
    expect(mockCheck).toHaveBeenCalledWith('habit-1');
    await unmount();

    mockStreak = { data: streakData({ checkedToday: true }), isPending: false };
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Read for ten minutes' }));
    expect(mockUncheck).toHaveBeenCalledWith('habit-1');
  });

  test('coming back after a break is welcomed, not blamed', async () => {
    mockHabits = { data: [habit()], isPending: false, isError: false };
    mockStreak = {
      data: streakData({ current: 0, welcomeBack: true, daysSinceLast: 9 }),
      isPending: false,
    };
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText('Welcome back. Today is a fresh start.')).toBeOnTheScreen();
  });

  test('a paused habit cannot be checked and can be resumed', async () => {
    mockHabits = { data: [habit({ isActive: false })], isPending: false, isError: false };
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText('Every day · Paused')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    expect(mockSetActive).toHaveBeenCalledWith({ habitId: 'habit-1', isActive: true });
  });

  test('habits can be removed', async () => {
    mockHabits = { data: [habit()], isPending: false, isError: false };
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(mockRemove).toHaveBeenCalledWith('habit-1');
  });

  test('adds a weekly habit with rest days', async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add your first habit' }));
    await fireEvent.changeText(screen.getByLabelText('What is the habit?'), 'Swim');
    await fireEvent.press(screen.getByRole('radio', { name: 'A few times a week' }));
    await fireEvent.press(screen.getByRole('radio', { name: '4' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Two' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add habit' }));
    expect(mockCreate).toHaveBeenCalledWith(
      {
        title: 'Swim',
        cadence: 'weekly',
        daysOfWeek: [],
        targetPerPeriod: 4,
        restDaysPerWeek: 2,
        goalId: null,
      },
      expect.any(Object),
    );
  });

  test('a custom habit needs at least one day', async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add your first habit' }));
    await fireEvent.changeText(screen.getByLabelText('What is the habit?'), 'Gym');
    await fireEvent.press(screen.getByRole('radio', { name: 'Pick days' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add habit' }));
    expect(screen.getByText('Pick at least one day.')).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mon' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Wed' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add habit' }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ cadence: 'custom', daysOfWeek: [1, 3] }),
      expect.any(Object),
    );
  });

  test('a load failure is calm', async () => {
    mockHabits = { data: undefined, isPending: false, isError: true };
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText(/Your data is safe/)).toBeOnTheScreen();
  });
});
