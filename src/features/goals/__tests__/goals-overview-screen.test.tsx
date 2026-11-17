import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { GoalsOverviewScreen } from '../screens/goals-overview-screen';
import { goalFixture } from './goal-fixtures';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
let mockGoals: {
  data: unknown;
  isPending: boolean;
  isError: boolean;
  isRefetching: boolean;
  error: unknown;
  refetch: typeof mockRefetch;
};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: jest.fn() },
}));

jest.mock('../use-goals', () => ({
  useGoals: () => mockGoals,
}));

describe('GoalsOverviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoals = {
      data: [goalFixture()],
      isPending: false,
      isError: false,
      isRefetching: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  test('lists active goals grouped by horizon', async () => {
    await renderWithProviders(<GoalsOverviewScreen />);
    expect(screen.getByRole('heading', { name: 'Goals' })).toBeOnTheScreen();
    expect(screen.getByText('Run a 10 km race')).toBeOnTheScreen();
    expect(screen.getAllByText('6 months').length).toBeGreaterThan(0);
  });

  test('opens create and detail', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GoalsOverviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Add a goal' }));
    expect(mockPush).toHaveBeenCalledWith('/goal/new');
    await user.press(screen.getByRole('button', { name: 'Run a 10 km race' }));
    expect(mockPush).toHaveBeenCalledWith('/goal/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  test('shows an empty state', async () => {
    mockGoals = { ...mockGoals, data: [] };
    await renderWithProviders(<GoalsOverviewScreen />);
    expect(screen.getByText('No goals yet')).toBeOnTheScreen();
    expect(screen.getByText(/Start with one thing you care about/i)).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Add a goal' })).toHaveLength(1);
  });

  test('shows a loading state', async () => {
    mockGoals = { ...mockGoals, isPending: true, data: undefined };
    await renderWithProviders(<GoalsOverviewScreen />);
    expect(screen.getByLabelText('Loading your goals')).toBeOnTheScreen();
  });

  test('shows a generic error and retry', async () => {
    const user = userEvent.setup();
    mockGoals = {
      ...mockGoals,
      isError: true,
      data: undefined,
      error: { kind: 'network' },
    };
    await renderWithProviders(<GoalsOverviewScreen />);
    expect(screen.getByText(/couldn't load your goals/i)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
