import { getSupabaseClient } from '@/lib/supabase/client';

import { type AuthLink, authRedirectPaths, getAuthRedirectUrl } from './auth-links';
import { classifyAuthError } from './auth-errors';
import {
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from './auth.schema';

function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Errors that would reveal whether an address has an account are swallowed, so
 * every caller shows the same "check your inbox" outcome.
 */
function throwUnlessEnumerationSafe(error: unknown) {
  const kind = classifyAuthError(error);
  if (kind === 'network' || kind === 'rateLimited' || kind === 'invalidEmail') throw error;
}

export async function signUp({ displayName, email, password }: SignUpInput) {
  const { error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(authRedirectPaths.verifyEmail),
      // Sanitized again by the database trigger that creates the profile.
      data: { display_name: displayName, timezone: getDeviceTimeZone() },
    },
  });
  if (error && classifyAuthError(error) !== 'accountExists') throw error;
}

export async function signIn({ email, password }: SignInInput) {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function resendVerificationEmail(email: string) {
  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getAuthRedirectUrl(authRedirectPaths.verifyEmail) },
  });
  if (error) throwUnlessEnumerationSafe(error);
}

export async function requestPasswordReset({ email }: ForgotPasswordInput) {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(authRedirectPaths.resetPassword),
  });
  if (error) throwUnlessEnumerationSafe(error);
}

export async function updatePassword({ password }: ResetPasswordInput) {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Ends the session on this device. The local session is removed even when the
 * network call fails, so a sign-out always takes effect on the phone.
 */
export async function signOut() {
  await getSupabaseClient().auth.signOut({ scope: 'local' });
}

const pendingLinks = new Map<string, Promise<void>>();

function linkKey(link: Exclude<AuthLink, { kind: 'none' } | { kind: 'error' }>) {
  if (link.kind === 'code') return link.code;
  if (link.kind === 'tokenHash') return link.tokenHash;
  return link.accessToken;
}

async function exchange(link: Exclude<AuthLink, { kind: 'none' } | { kind: 'error' }>) {
  const auth = getSupabaseClient().auth;
  const { error } =
    link.kind === 'code'
      ? await auth.exchangeCodeForSession(link.code)
      : link.kind === 'tokenHash'
        ? await auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
        : await auth.setSession({
            access_token: link.accessToken,
            refresh_token: link.refreshToken,
          });
  if (error) throw error;
  if (link.kind === 'implicit' && typeof window !== 'undefined' && window.location?.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * Turns an email link into a session. A link can only be redeemed once, so
 * repeated calls for the same link (re-renders, strict mode) share one request.
 */
export function completeAuthLink(link: Exclude<AuthLink, { kind: 'none' } | { kind: 'error' }>) {
  const key = linkKey(link);
  const existing = pendingLinks.get(key);
  if (existing) return existing;
  const request = exchange(link);
  pendingLinks.set(key, request);
  return request;
}
