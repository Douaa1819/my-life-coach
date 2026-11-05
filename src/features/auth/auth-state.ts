import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthNotice = 'sessionExpired' | null;

/**
 * Definitive ends only. supabase-js keeps the session through network errors,
 * timeouts and retryable refresh failures, and emits SIGNED_OUT only once the
 * refresh token is rejected, so none of those transient cases appear here.
 */
export type SessionEndReason = 'signOutRequested' | 'sessionRejected' | 'userChanged';

export type EndedSession = { userId: string; reason: SessionEndReason };

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  /** Signed in through a password-reset link and must choose a new password first. */
  isRecovery: boolean;
  /** Shown once on the sign-in screens, then dismissed. */
  notice: AuthNotice;
  /** True between the user pressing "Sign out" and the SIGNED_OUT event. */
  signOutRequested: boolean;
  /** The last signed-in user whose session definitively ended. Their local drafts are deleted. */
  endedSession: EndedSession | null;
};

export type AuthAction =
  | { type: 'authEvent'; event: AuthChangeEvent; session: Session | null }
  | { type: 'signOutRequested' }
  | { type: 'recoveryCompleted' }
  | { type: 'noticeDismissed' };

export const initialAuthState: AuthState = {
  status: 'loading',
  session: null,
  isRecovery: false,
  notice: null,
  signOutRequested: false,
  endedSession: null,
};

function endReason(state: AuthState, event: AuthChangeEvent): SessionEndReason | null {
  if (state.signOutRequested) return 'signOutRequested';
  return event === 'SIGNED_OUT' ? 'sessionRejected' : null;
}

function signedOut(state: AuthState, event: AuthChangeEvent): AuthState {
  const lostSession = state.status === 'signedIn' || event === 'SIGNED_OUT';
  const expired = lostSession && !state.signOutRequested;
  const reason = endReason(state, event);
  return {
    status: 'signedOut',
    session: null,
    isRecovery: false,
    notice: expired ? 'sessionExpired' : state.notice,
    signOutRequested: false,
    endedSession:
      state.session && reason ? { userId: state.session.user.id, reason } : state.endedSession,
  };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'authEvent': {
      const { event, session } = action;
      if (!session || event === 'SIGNED_OUT') return signedOut(state, event);

      const previousUserId = state.session?.user.id;
      const sameUser = previousUserId === session.user.id;
      return {
        status: 'signedIn',
        session,
        isRecovery: event === 'PASSWORD_RECOVERY' || (state.isRecovery && sameUser),
        notice: null,
        signOutRequested: false,
        endedSession:
          previousUserId && !sameUser
            ? { userId: previousUserId, reason: 'userChanged' }
            : state.endedSession,
      };
    }
    case 'signOutRequested':
      return { ...state, signOutRequested: true };
    case 'recoveryCompleted':
      return state.isRecovery ? { ...state, isRecovery: false } : state;
    case 'noticeDismissed':
      return state.notice ? { ...state, notice: null } : state;
  }
}
