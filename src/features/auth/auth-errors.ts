import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

export type AuthErrorKind =
  | 'network'
  | 'rateLimited'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'weakPassword'
  | 'samePassword'
  | 'invalidEmail'
  | 'signupDisabled'
  | 'accountExists'
  | 'linkExpired'
  | 'sessionExpired'
  | 'unknown';

const codeToKind: Record<string, AuthErrorKind> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  email_address_invalid: 'invalidEmail',
  validation_failed: 'invalidEmail',
  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
  user_already_exists: 'accountExists',
  email_exists: 'accountExists',
  over_request_rate_limit: 'rateLimited',
  over_email_send_rate_limit: 'rateLimited',
  otp_expired: 'linkExpired',
  flow_state_expired: 'linkExpired',
  flow_state_not_found: 'linkExpired',
  bad_code_verifier: 'linkExpired',
  bad_oauth_state: 'linkExpired',
  session_expired: 'sessionExpired',
  session_not_found: 'sessionExpired',
  refresh_token_not_found: 'sessionExpired',
  refresh_token_already_used: 'sessionExpired',
  reauthentication_needed: 'sessionExpired',
};

function isNetworkFailure(error: unknown) {
  return (
    isAuthRetryableFetchError(error) ||
    (error instanceof TypeError && /network|fetch/i.test(error.message))
  );
}

/** Reduces any thrown or returned auth error to a small, safe set of cases. */
export function classifyAuthError(error: unknown): AuthErrorKind {
  if (isNetworkFailure(error)) return 'network';
  if (!isAuthError(error)) return 'unknown';
  if (error.code && error.code in codeToKind) return codeToKind[error.code] ?? 'unknown';
  if (error.status === 429) return 'rateLimited';
  if (error.name === 'AuthSessionMissingError') return 'sessionExpired';
  return 'unknown';
}

const messages: Record<AuthErrorKind, string> = {
  network: "We couldn't reach the server. Check your connection and try again.",
  rateLimited: 'Too many attempts. Please wait a minute and try again.',
  invalidCredentials: 'Email or password is incorrect.',
  emailNotConfirmed: 'Please confirm your email address first. We can send you a new link.',
  weakPassword: 'Choose a stronger password: at least 8 characters with letters and numbers.',
  samePassword: 'Choose a password you have not used for this account before.',
  invalidEmail: 'Enter a valid email address.',
  signupDisabled: 'New sign-ups are paused right now. Please try again later.',
  accountExists: 'Please check your inbox to continue.',
  linkExpired: 'This link has expired or was already used. Request a new one.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * User-facing copy for an auth failure. Raw server messages are never shown:
 * they can leak internals and differ between "unknown email" and "wrong password".
 */
export function getAuthErrorMessage(kind: AuthErrorKind): string {
  return messages[kind];
}
