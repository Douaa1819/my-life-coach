import { type Session } from '@supabase/supabase-js';

import { type AuthState, authReducer, initialAuthState } from '../auth-state';

function session(userId: string): Session {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

function signedIn(userId = 'user-a'): AuthState {
  return authReducer(initialAuthState, {
    type: 'authEvent',
    event: 'INITIAL_SESSION',
    session: session(userId),
  });
}

describe('authReducer', () => {
  test('starts loading', () => {
    expect(initialAuthState.status).toBe('loading');
  });

  test('restores a stored session on start', () => {
    const state = signedIn();
    expect(state.status).toBe('signedIn');
    expect(state.session?.user.id).toBe('user-a');
    expect(state.isRecovery).toBe(false);
  });

  test('resolves to signed out without a stored session, with no notice', () => {
    const state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'INITIAL_SESSION',
      session: null,
    });
    expect(state).toMatchObject({ status: 'signedOut', session: null, notice: null });
  });

  test('a user-initiated sign-out shows no notice', () => {
    let state = authReducer(signedIn(), { type: 'signOutRequested' });
    state = authReducer(state, { type: 'authEvent', event: 'SIGNED_OUT', session: null });
    expect(state).toMatchObject({ status: 'signedOut', notice: null, signOutRequested: false });
  });

  test('losing the session without asking reports it as expired', () => {
    const state = authReducer(signedIn(), {
      type: 'authEvent',
      event: 'SIGNED_OUT',
      session: null,
    });
    expect(state).toMatchObject({ status: 'signedOut', notice: 'sessionExpired' });
  });

  test('a refresh failure at start-up is reported as expired', () => {
    const state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'SIGNED_OUT',
      session: null,
    });
    expect(state.notice).toBe('sessionExpired');
  });

  test('signing in clears the notice', () => {
    let state = authReducer(signedIn(), { type: 'authEvent', event: 'SIGNED_OUT', session: null });
    state = authReducer(state, { type: 'authEvent', event: 'SIGNED_IN', session: session('a') });
    expect(state.notice).toBeNull();
  });

  test('dismissing the notice clears it', () => {
    let state = authReducer(signedIn(), { type: 'authEvent', event: 'SIGNED_OUT', session: null });
    state = authReducer(state, { type: 'noticeDismissed' });
    expect(state.notice).toBeNull();
  });

  test('a password-recovery link enters recovery mode', () => {
    const state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'PASSWORD_RECOVERY',
      session: session('user-a'),
    });
    expect(state).toMatchObject({ status: 'signedIn', isRecovery: true });
  });

  test('recovery survives token refreshes for the same user', () => {
    let state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'PASSWORD_RECOVERY',
      session: session('user-a'),
    });
    state = authReducer(state, {
      type: 'authEvent',
      event: 'TOKEN_REFRESHED',
      session: session('user-a'),
    });
    expect(state.isRecovery).toBe(true);
  });

  test('recovery does not carry over to another user', () => {
    let state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'PASSWORD_RECOVERY',
      session: session('user-a'),
    });
    state = authReducer(state, { type: 'authEvent', event: 'SIGNED_IN', session: session('b') });
    expect(state.isRecovery).toBe(false);
  });

  test('completing recovery leaves the user signed in', () => {
    let state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'PASSWORD_RECOVERY',
      session: session('user-a'),
    });
    state = authReducer(state, { type: 'recoveryCompleted' });
    expect(state).toMatchObject({ status: 'signedIn', isRecovery: false });
  });

  test('signing out ends recovery', () => {
    let state = authReducer(initialAuthState, {
      type: 'authEvent',
      event: 'PASSWORD_RECOVERY',
      session: session('user-a'),
    });
    state = authReducer(state, { type: 'authEvent', event: 'SIGNED_OUT', session: null });
    expect(state.isRecovery).toBe(false);
  });
});
