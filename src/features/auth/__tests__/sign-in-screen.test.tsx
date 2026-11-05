import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { resendVerificationEmail, signIn } from '../auth.api';
import { SignInScreen } from '../screens/sign-in-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../auth.api', () => ({
  signIn: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));

jest.mock('../auth-provider', () => ({
  useAuth: () => ({
    state: {
      status: 'signedOut',
      session: null,
      isRecovery: false,
      notice: null,
      signOutRequested: false,
      endedSession: null,
    },
  }),
}));

const signInMock = jest.mocked(signIn);
const resendMock = jest.mocked(resendVerificationEmail);

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('shows validation errors and does not call the server', async () => {
    await renderWithProviders(<SignInScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(signInMock).not.toHaveBeenCalled();
  });

  test('signs in with normalized credentials', async () => {
    signInMock.mockResolvedValue();
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit('  Sara@Example.com ', 'runfast10k');

    expect(signInMock.mock.calls[0]?.[0]).toEqual({
      email: 'sara@example.com',
      password: 'runfast10k',
    });
  });

  test('shows one neutral message for wrong credentials', async () => {
    signInMock.mockRejectedValue(
      new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    );
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit('sara@example.com', 'wrong-password1');

    expect(await screen.findByText('Email or password is incorrect.')).toBeOnTheScreen();
    expect(screen.queryByText('Invalid login credentials')).toBeNull();
  });

  test('explains network failures', async () => {
    signInMock.mockRejectedValue(new AuthRetryableFetchError('Failed to fetch', 0));
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit('sara@example.com', 'runfast10k');

    expect(
      await screen.findByText("We couldn't reach the server. Check your connection and try again."),
    ).toBeOnTheScreen();
  });

  test('offers a new confirmation link for unconfirmed accounts', async () => {
    signInMock.mockRejectedValue(
      new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
    );
    resendMock.mockResolvedValue();
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit('sara@example.com', 'runfast10k');

    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Send a new confirmation link' }));

    expect(resendMock.mock.calls[0]?.[0]).toBe('sara@example.com');
    expect(
      await screen.findByText('We sent a new confirmation link. Check your inbox.'),
    ).toBeOnTheScreen();
  });
});
