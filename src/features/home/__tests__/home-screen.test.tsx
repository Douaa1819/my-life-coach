import { screen } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/home-screen';
import { renderWithProviders } from '@/test/render';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/features/profile/use-profile', () => ({
  useProfile: () => ({
    data: { id: 'user-a', displayName: 'Sara', onboardingCompleted: false },
    refetch: jest.fn(),
  }),
}));

jest.mock('@/features/goals/use-goals', () => ({
  useGoals: () => ({
    data: [
      {
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
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const morning = new Date(2026, 10, 3, 9, 0, 0);

describe('HomeScreen', () => {
  test('shows real goals, a goals summary and an honest missions placeholder', async () => {
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(await screen.findByRole('heading', { name: 'Good morning, Sara' })).toBeOnTheScreen();
    expect(screen.getByText('Train for the spring 10k')).toBeOnTheScreen();
    expect(screen.getByLabelText('Goals: 1 in progress, 0 completed')).toBeOnTheScreen();
    expect(screen.getByText('Daily missions are coming soon')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeOnTheScreen();
    expect(screen.queryByText(/-day streak/)).toBeNull();
    expect(screen.queryByText(/Sample/)).toBeNull();
  });
});
