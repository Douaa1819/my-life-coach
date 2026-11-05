import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { profileQueryKeys } from '@/features/profile/use-profile';
import { createChunkedStorage, type KeyValueStore } from '@/lib/supabase/chunked-storage';
import { createTestQueryClient } from '@/test/render';

import { createOnboardingDraftStore, draftKey } from '../onboarding-draft-store';
import { useOnboarding } from '../use-onboarding';
import { completeAnswers, USER_A, USER_B } from './onboarding-fixtures';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

function setup() {
  const items = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  };
  const draftStore = createOnboardingDraftStore(createChunkedStorage(store));
  const save = jest.spyOn(draftStore, 'save');
  const queryClient = createTestQueryClient();

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const render = (userId = USER_A) =>
    renderHook(
      (props: { userId: string }) =>
        useOnboarding({ userId: props.userId, initialName: 'Sara', draftStore }),
      { wrapper, initialProps: { userId } },
    );

  return { items, draftStore, save, queryClient, render };
}

async function ready(result: { current: ReturnType<typeof useOnboarding> }) {
  await waitFor(() => expect(result.current.isRestoring).toBe(false));
}

beforeEach(() => jest.clearAllMocks());

describe('useOnboarding', () => {
  test('restores the saved draft and saves again only after a move', async () => {
    const { draftStore, save, render } = setup();
    await draftStore.save(USER_A, 'goal', completeAnswers());
    save.mockClear();

    const { result } = await render();
    await ready(result);
    expect(result.current.state.step).toBe('goal');

    await act(async () => {
      result.current.dispatch({ type: 'setText', field: 'goalTitle', value: 'Run 10 km' });
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      result.current.dispatch({ type: 'next' });
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenLastCalledWith(
      USER_A,
      'horizon',
      expect.objectContaining({ goalTitle: 'Run 10 km' }),
    );
  });

  test('a different user starts fresh and never receives the previous answers', async () => {
    const { save, items, render } = setup();
    const { result, rerender } = await render(USER_A);
    await ready(result);

    await act(async () => {
      result.current.dispatch({ type: 'next' });
      result.current.dispatch({ type: 'setText', field: 'displayName', value: 'Alice private' });
    });
    save.mockClear();

    await rerender({ userId: USER_B });
    await ready(result);

    expect(result.current.state.ownerId).toBe(USER_B);
    expect(result.current.state.step).toBe('intro');
    expect(result.current.state.answers.displayName).toBe('Sara');
    expect(save.mock.calls.every(([userId]) => userId !== USER_B)).toBe(true);
    expect(items.get(draftKey(USER_B)) ?? '').not.toContain('Alice private');
  });

  test('going to the background saves what was typed on the current step', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
      onChange = handler;
      return { remove: jest.fn() };
    });
    const { draftStore, render } = setup();
    const { result } = await render();
    await ready(result);

    await act(async () => {
      result.current.dispatch({ type: 'next' });
      result.current.dispatch({ type: 'setText', field: 'displayName', value: 'Sam' });
    });
    await act(async () => {
      onChange?.('background');
    });

    await expect(draftStore.load(USER_A)).resolves.toMatchObject({
      step: 'name',
      answers: { displayName: 'Sam' },
    });
    jest.restoreAllMocks();
  });

  test('success clears the draft, stops saving and lets finish open Home', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { items, save, queryClient, render } = setup();
    const key = profileQueryKeys.detail(USER_A);
    queryClient.setQueryData(key, { id: USER_A, onboardingCompleted: false });

    const { result } = await render();
    await ready(result);
    await act(async () => {
      result.current.dispatch({
        type: 'restore',
        draft: { userId: USER_A, step: 'review', answers: completeAnswers() },
      });
    });

    await act(async () => {
      result.current.submitAnswers();
    });
    await waitFor(() => expect(result.current.isCompleted).toBe(true));
    await waitFor(() => expect(items.size).toBe(0));

    save.mockClear();
    await act(async () => {
      result.current.dispatch({ type: 'back' });
    });
    expect(save).not.toHaveBeenCalled();

    mockRpc.mockClear();
    await act(async () => {
      void result.current.finish();
    });
    expect(queryClient.getQueryData(key)).toMatchObject({ onboardingCompleted: true });
  });

  test('a server validation error sends the user to the step to fix', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'invalid_goal_title' },
    });
    const { render } = setup();
    const { result } = await render();
    await ready(result);
    await act(async () => {
      result.current.dispatch({
        type: 'restore',
        draft: { userId: USER_A, step: 'review', answers: completeAnswers() },
      });
    });

    await act(async () => {
      result.current.submitAnswers();
    });

    await waitFor(() => expect(result.current.state.step).toBe('goal'));
    expect(result.current.state.returnToReview).toBe(true);
    expect(result.current.isCompleted).toBe(false);
  });
});
