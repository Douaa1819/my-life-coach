import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthNotice = 'sessionExpired' | null;

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  /** Signed in through a password-reset link and must choose a new password first. */
  isRecovery: boolean;
  /** Shown once on the sign-in screens, then dismissed. */
  notice: AuthNotice;
  /** True between the user pressing "Sign out" and the SIGNED_OUT event. */
  signOutRequested: boolean;
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
};

function signedOut(state: AuthState, event: AuthChangeEvent): AuthState {
  const lostSession = state.status === 'signedIn' || event === 'SIGNED_OUT';
  const expired = lostSession && !state.signOutRequested;
  return {
    status: 'signedOut',
    session: null,
    isRecovery: false,
    notice: expired ? 'sessionExpired' : state.notice,
    signOutRequested: false,
  };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'authEvent': {
      const { event, session } = action;
      if (!session || event === 'SIGNED_OUT') return signedOut(state, event);

      const sameUser = state.session?.user.id === session.user.id;
      return {
        status: 'signedIn',
        session,
        isRecovery: event === 'PASSWORD_RECOVERY' || (state.isRecovery && sameUser),
        notice: null,
        signOutRequested: false,
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
