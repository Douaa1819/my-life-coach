import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { onboardingDraftStore } from '@/features/onboarding/onboarding-draft';
import { getSupabaseClient } from '@/lib/supabase/client';

import { signOut as signOutRequest } from './auth.api';
import { type AuthState, authReducer, initialAuthState } from './auth-state';

type AuthContextValue = {
  state: AuthState;
  signOut: () => Promise<void>;
  completeRecovery: () => void;
  dismissNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const queryClient = useQueryClient();

  useEffect(() => {
    // The callback must stay synchronous: calling other auth methods inside it
    // can deadlock supabase-js. It only records the event.
    const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
      dispatch({ type: 'authEvent', event, session });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // One account's cached data must never be shown to the next account.
  const userId = state.session?.user.id ?? null;
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    if (previousUserId.current !== null && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [userId, queryClient]);

  // Saves still queued for that user are dropped by the store, so the draft cannot reappear.
  const { endedSession } = state;
  useEffect(() => {
    if (endedSession) void onboardingDraftStore.clear(endedSession.userId);
  }, [endedSession]);

  const signOut = useCallback(async () => {
    dispatch({ type: 'signOutRequested' });
    await signOutRequest();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signOut,
      completeRecovery: () => dispatch({ type: 'recoveryCompleted' }),
      dismissNotice: () => dispatch({ type: 'noticeDismissed' }),
    }),
    [state, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}

export function useSessionUser() {
  const { state } = useAuth();
  return state.session?.user ?? null;
}
