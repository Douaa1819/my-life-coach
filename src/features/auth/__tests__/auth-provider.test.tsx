import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { act, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { AuthProvider, useAuth } from '../auth-provider';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

let mockEmit: Listener = () => undefined;
const mockUnsubscribe = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      onAuthStateChange: (listener: Listener) => {
        mockEmit = listener;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: mockSignOut,
    },
  }),
}));

function session(userId: string) {
  return { access_token: 'a', refresh_token: 'r', user: { id: userId } } as Session;
}

function Probe() {
  const { state, signOut } = useAuth();
  return (
    <>
      <Text>{`${state.status}:${state.notice ?? 'none'}`}</Text>
      <Pressable role="button" aria-label="Sign out" onPress={() => void signOut()} />
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  test('moves from loading to the restored session', async () => {
    await renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('loading:none')).toBeOnTheScreen();

    await act(async () => mockEmit('INITIAL_SESSION', session('user-a')));
    expect(screen.getByText('signedIn:none')).toBeOnTheScreen();
  });

  test('a user sign-out signs out locally without a notice', async () => {
    await renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => mockEmit('INITIAL_SESSION', session('user-a')));

    await userEvent.setup().press(screen.getByRole('button', { name: 'Sign out' }));
    await act(async () => mockEmit('SIGNED_OUT', null));

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(screen.getByText('signedOut:none')).toBeOnTheScreen();
  });

  test('an expired session is reported to the user', async () => {
    await renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => mockEmit('INITIAL_SESSION', session('user-a')));
    await act(async () => mockEmit('SIGNED_OUT', null));

    expect(screen.getByText('signedOut:sessionExpired')).toBeOnTheScreen();
  });

  test('clears cached data when the session ends, so the next user never sees it', async () => {
    const queryClient = createTestQueryClient();
    await renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
      { queryClient },
    );
    await act(async () => mockEmit('INITIAL_SESSION', session('user-a')));
    queryClient.setQueryData(['profile', 'user-a'], { displayName: 'Alice' });

    await act(async () => mockEmit('SIGNED_OUT', null));

    expect(queryClient.getQueryData(['profile', 'user-a'])).toBeUndefined();
  });

  test('unsubscribes on unmount', async () => {
    const view = await renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await view.unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
