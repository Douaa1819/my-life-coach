import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import {
  completeAuthLink,
  requestPasswordReset,
  resendVerificationEmail,
  signOut,
  signUp,
} from '../auth.api';

const mockAuth = {
  signUp: jest.fn(),
  resend: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  signOut: jest.fn(),
  setSession: jest.fn(),
};

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ auth: mockAuth }),
}));

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `aicoach://${path}`,
}));

const registration = { displayName: 'Sara', email: 'sara@example.com', password: 'runfast10k' };

describe('signUp', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sends the confirmation redirect and profile metadata', async () => {
    mockAuth.signUp.mockResolvedValue({ data: {}, error: null });
    await signUp(registration);

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'sara@example.com',
      password: 'runfast10k',
      options: {
        emailRedirectTo: 'aicoach://verify-email',
        data: { display_name: 'Sara', timezone: expect.any(String) },
      },
    });
  });

  test('an existing account resolves like a new sign-up', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: {},
      error: new AuthApiError('User already registered', 422, 'user_already_exists'),
    });
    await expect(signUp(registration)).resolves.toBeUndefined();
  });

  test('other failures are reported', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: {},
      error: new AuthApiError('weak', 422, 'weak_password'),
    });
    await expect(signUp(registration)).rejects.toMatchObject({ code: 'weak_password' });
  });
});

describe('enumeration-safe requests', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a reset request hides account-specific errors', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new AuthApiError('User not found', 400, 'user_not_found'),
    });
    await expect(requestPasswordReset({ email: 'nobody@example.com' })).resolves.toBeUndefined();
  });

  test('a reset request still reports being offline or rate limited', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    await expect(requestPasswordReset({ email: 'a@b.co' })).rejects.toBeInstanceOf(
      AuthRetryableFetchError,
    );

    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new AuthApiError('slow down', 429, 'over_email_send_rate_limit'),
    });
    await expect(requestPasswordReset({ email: 'a@b.co' })).rejects.toMatchObject({ status: 429 });
  });

  test('resending a confirmation hides account-specific errors', async () => {
    mockAuth.resend.mockResolvedValue({
      data: {},
      error: new AuthApiError('already confirmed', 400, 'email_address_not_authorized'),
    });
    await expect(resendVerificationEmail('a@b.co')).resolves.toBeUndefined();
  });
});

describe('signOut', () => {
  test('only ends the session on this device', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('completeAuthLink', () => {
  beforeEach(() => jest.clearAllMocks());

  test('stores a recovery session from implicit hash tokens', async () => {
    mockAuth.setSession.mockResolvedValue({ data: {}, error: null });
    await completeAuthLink({
      kind: 'implicit',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mockAuth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });
});
