import { fireEvent, screen } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/home-screen';
import { renderWithProviders } from '@/test/render';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    navigate: (...args: unknown[]) => mockNavigate(...args),
    replace: jest.fn(),
  },
}));

jest.mock('@/features/profile/use-profile', () => ({
  useProfile: () => ({
    data: { id: 'user-a', displayName: 'Sara', onboardingCompleted: false },
    refetch: jest.fn(),
  }),
}));

function goal(overrides: Record<string, unknown>) {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: 'user-a',
    title: 'Train for the spring 10k',
    description: null,
    category: 'health',
    horizon: '6_months',
    status: 'active',
    targetDate: null,
    completedAt: null,
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
    ...overrides,
  };
}

let mockGoals: {
  data: unknown[] | undefined;
  isPending: boolean;
  isError: boolean;
};

jest.mock('@/features/goals/use-goals', () => ({
  useGoals: () => ({ ...mockGoals, error: null, refetch: mockRefetch }),
}));

const morning = new Date(2026, 10, 3, 9, 0, 0);

beforeEach(() => {
  jest.clearAllMocks();
  mockGoals = { data: [goal({})], isPending: false, isError: false };
});

describe('HomeScreen', () => {
  test('leads with the focus goal and an honest missions line', async () => {
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(await screen.findByRole('heading', { name: 'Good morning, Sara' })).toBeOnTheScreen();
    expect(screen.getByText('Train for the spring 10k')).toBeOnTheScreen();
    expect(screen.getByText(/Daily missions are on their way/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeOnTheScreen();
    expect(screen.queryByText(/-day streak/)).toBeNull();
    expect(screen.queryByText(/Sample/)).toBeNull();
  });

  test('shows real progress: how many goals are reached', async () => {
    mockGoals = {
      data: [
        goal({}),
        goal({ id: 'c1', title: 'Read 12 books', category: 'learning', status: 'completed' }),
        goal({ id: 'c2', title: 'Save for a trip', category: 'finance' }),
        goal({ id: 'c3', title: 'Old idea', status: 'archived' }),
      ],
      isPending: false,
      isError: false,
    };
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(screen.getByRole('progressbar', { name: '1 of 3 goals reached' })).toBeOnTheScreen();
    expect(screen.getByText('1 of 3 goals reached')).toBeOnTheScreen();
    // The lead goal is in the focus card; the rest are listed once. Archived goals are not.
    expect(screen.getByRole('button', { name: 'Save for a trip' })).toBeOnTheScreen();
    expect(screen.queryByText('Old idea')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Read 12 books' })).toBeNull();
  });

  test('opens the coach and the goal', async () => {
    await renderWithProviders(<HomeScreen now={morning} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Talk it through' }));
    expect(mockNavigate).toHaveBeenCalledWith('/coach');

    await fireEvent.press(screen.getByRole('button', { name: /Train for the spring 10k/ }));
    expect(mockPush).toHaveBeenCalledWith('/goal/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  test('first day: invites the first goal', async () => {
    mockGoals = { data: [], isPending: false, isError: false };
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(screen.getByText('What is one goal you would love to reach?')).toBeOnTheScreen();
    expect(screen.queryByText(/Daily missions/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add your first goal' }));
    expect(mockPush).toHaveBeenCalledWith('/goal/new');
  });

  test('loading: shows placeholder shapes with a label', async () => {
    mockGoals = { data: undefined, isPending: true, isError: false };
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(screen.getByRole('progressbar', { name: 'Loading your day' })).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Good morning, Sara' })).toBeOnTheScreen();
  });

  test('error: says goals are safe and retries', async () => {
    mockGoals = { data: undefined, isPending: false, isError: true };
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(screen.getByText('We could not load your goals')).toBeOnTheScreen();
    expect(screen.getByText(/your goals are safe/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  test('every goal reached: offers the next goal instead of a focus card', async () => {
    mockGoals = { data: [goal({ status: 'completed' })], isPending: false, isError: false };
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(screen.getByText('Ready for the next one?')).toBeOnTheScreen();
    expect(screen.getByText('1 of 1 goal reached')).toBeOnTheScreen();
  });
});
