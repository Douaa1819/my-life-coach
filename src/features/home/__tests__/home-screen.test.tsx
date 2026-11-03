import { screen, userEvent } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/home-screen';
import { renderWithProviders } from '@/test/render';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
}));

const morning = new Date(2026, 10, 3, 9, 0, 0);

describe('HomeScreen', () => {
  test('shows the welcome, progress, missions, coach entry and goals', async () => {
    await renderWithProviders(<HomeScreen now={morning} />);

    expect(await screen.findByRole('heading', { name: 'Good morning, Sara' })).toBeOnTheScreen();
    expect(screen.getByText('Sample data · not saved')).toBeOnTheScreen();
    expect(screen.getByText('1 of 4 missions')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Easy 25-minute run' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeOnTheScreen();
    expect(screen.getByText('Run a 10 km race')).toBeOnTheScreen();
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
