import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { act, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import {
  completeAnswers,
  USER_A,
  USER_B,
} from '@/features/onboarding/__tests__/onboarding-fixtures';
import { onboardingDraftStore } from '@/features/onboarding/onboarding-draft';
import type * as DraftStoreModule from '@/features/onboarding/onboarding-draft-store';
import type * as ChunkedStorageModule from '@/lib/supabase/chunked-storage';
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

jest.mock('@/features/onboarding/onboarding-draft', () => {
  const { createOnboardingDraftStore } = jest.requireActual<typeof DraftStoreModule>(
    '@/features/onboarding/onboarding-draft-store',
  );
  const { createChunkedStorage } = jest.requireActual<typeof ChunkedStorageModule>(
    '@/lib/supabase/chunked-storage',
  );
  const items = new Map<string, string>();
  const storage = createChunkedStorage({
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  });
  return { onboardingDraftStore: createOnboardingDraftStore(storage) };
});

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

  describe('onboarding drafts', () => {
    const answers = completeAnswers();
    afterEach(() => jest.restoreAllMocks());

    async function signedInWithDraft(userId: string) {
      await renderWithProviders(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await act(async () => mockEmit('INITIAL_SESSION', session(userId)));
      await onboardingDraftStore.load(userId);
      await onboardingDraftStore.save(userId, 'goal', answers);
    }

    const draftOf = (userId: string) => onboardingDraftStore.load(userId);

    test('an explicit sign-out deletes the draft, and a late save cannot bring it back', async () => {
      await signedInWithDraft(USER_A);
      const clear = jest.spyOn(onboardingDraftStore, 'clear');

      await userEvent.setup().press(screen.getByRole('button', { name: 'Sign out' }));
      await act(async () => mockEmit('SIGNED_OUT', null));
      expect(clear).toHaveBeenCalledWith(USER_A);

      await onboardingDraftStore.save(USER_A, 'checkIn', answers);
      await expect(draftOf(USER_A)).resolves.toBeNull();
    });

    test('a rejected session deletes the draft', async () => {
      await signedInWithDraft(USER_A);
      await act(async () => mockEmit('SIGNED_OUT', null));
      await expect(draftOf(USER_A)).resolves.toBeNull();
    });

    test("switching accounts deletes the previous user's draft only", async () => {
      await signedInWithDraft(USER_A);
      await onboardingDraftStore.save(USER_B, 'name', answers);

      await act(async () => mockEmit('SIGNED_IN', session(USER_B)));

      await expect(draftOf(USER_A)).resolves.toBeNull();
      await expect(draftOf(USER_B)).resolves.toMatchObject({ userId: USER_B });
    });

    test('a token refresh keeps the draft', async () => {
      await signedInWithDraft(USER_A);
      const clear = jest.spyOn(onboardingDraftStore, 'clear');

      await act(async () => mockEmit('TOKEN_REFRESHED', session(USER_A)));

      expect(clear).not.toHaveBeenCalled();
      await expect(draftOf(USER_A)).resolves.toMatchObject({ step: 'goal' });
    });
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
