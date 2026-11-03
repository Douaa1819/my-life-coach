import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';

import { classifyAuthError, getAuthErrorMessage } from '../auth-errors';

function apiError(code: string, status = 400) {
  return new AuthApiError('raw server message with internals', status, code);
}

describe('classifyAuthError', () => {
  test.each([
    ['invalid_credentials', 'invalidCredentials'],
    ['email_not_confirmed', 'emailNotConfirmed'],
    ['weak_password', 'weakPassword'],
    ['same_password', 'samePassword'],
    ['user_already_exists', 'accountExists'],
    ['over_email_send_rate_limit', 'rateLimited'],
    ['otp_expired', 'linkExpired'],
    ['bad_code_verifier', 'linkExpired'],
    ['flow_state_not_found', 'linkExpired'],
    ['refresh_token_not_found', 'sessionExpired'],
  ])('maps %s to %s', (code, kind) => {
    expect(classifyAuthError(apiError(code))).toBe(kind);
  });

  test('treats fetch failures as network errors', () => {
    expect(classifyAuthError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
    expect(classifyAuthError(new TypeError('Network request failed'))).toBe('network');
  });

  test('falls back to the HTTP status for rate limits without a code', () => {
    expect(classifyAuthError(new AuthApiError('slow down', 429, undefined))).toBe('rateLimited');
  });

  test('maps a missing session to an expired session', () => {
    expect(classifyAuthError(new AuthSessionMissingError())).toBe('sessionExpired');
  });

  test('anything unexpected is unknown', () => {
    expect(classifyAuthError(apiError('something_new'))).toBe('unknown');
    expect(classifyAuthError(new Error('boom'))).toBe('unknown');
    expect(classifyAuthError('string')).toBe('unknown');
  });
});

describe('getAuthErrorMessage', () => {
  test('never echoes the server message', () => {
    const kind = classifyAuthError(apiError('invalid_credentials'));
    expect(getAuthErrorMessage(kind)).not.toContain('internals');
  });

  test('uses one message for unknown email and wrong password', () => {
    expect(getAuthErrorMessage('invalidCredentials')).toBe('Email or password is incorrect.');
  });

  test('does not tell the user an account already exists', () => {
    expect(getAuthErrorMessage('accountExists')).not.toMatch(/exist|registered|taken/i);
  });
});
