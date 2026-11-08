import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { resetWelcomeEntranceForTests, WelcomeScreen } from '../screens/welcome-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ state: { notice: null } }),
}));

beforeEach(() => {
  mockPush.mockClear();
  resetWelcomeEntranceForTests();
});

describe('WelcomeScreen', () => {
  test('primary actions work during the entrance animation', async () => {
    await renderWithProviders(<WelcomeScreen />);

    expect(screen.getByRole('heading', { name: 'Small steps, every day.' })).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Create an account' }));
    expect(mockPush).toHaveBeenCalledWith('/sign-up');
  });
});
