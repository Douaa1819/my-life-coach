import { screen, userEvent } from '@testing-library/react-native';

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
  test('shows the welcome, progress, missions, coach entry and real goals', async () => {
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(await screen.findByRole('heading', { name: 'Good morning, Sara' })).toBeOnTheScreen();
    expect(screen.getByText('Sample missions · not saved')).toBeOnTheScreen();
    expect(screen.getByText('1 of 4 missions')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Easy 25-minute run' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeOnTheScreen();
    expect(screen.getByText('Train for the spring 10k')).toBeOnTheScreen();
    expect(screen.queryByText('of 6 milestones')).toBeNull();
  });

  test('toggling a mission updates the daily progress', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HomeScreen now={morning} />);

    const mission = await screen.findByRole('checkbox', { name: 'Read 20 pages before bed' });
    await user.press(mission);

    expect(await screen.findByText('2 of 4 missions')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Read 20 pages before bed' })).toBeChecked();
  });
});
