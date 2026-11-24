import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { createChunkedStorage, type KeyValueStore } from '@/lib/supabase/chunked-storage';
import { renderWithProviders } from '@/test/render';

import { createOnboardingDraftStore, draftKey } from '../onboarding-draft-store';
import { OnboardingFlowScreen } from '../screens/onboarding-flow-screen';
import { useOnboarding } from '../use-onboarding';
import { completeAnswers, USER_A, USER_B } from './onboarding-fixtures';

/**
 * Integration tests: the real hook, the real flow screen and the real draft
 * store over in-memory storage. Only the network, router and auth are faked.
 */

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: () => undefined,
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ signOut: jest.fn(), state: { notice: null } }),
}));

jest.mock('@/features/profile/use-profile', () => ({
  ...jest.requireActual('@/features/profile/use-profile'),
  useProfile: () => ({ data: { timezone: 'Africa/Casablanca' } }),
}));

function createMemoryStorage() {
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
  const storage = createChunkedStorage(store);
  return { items, storage };
}

function setup() {
  const memory = createMemoryStorage();
  const draftStore = createOnboardingDraftStore(memory.storage);

  function Harness({ userId }: { userId: string }) {
    const onboarding = useOnboarding({ userId, initialName: 'Sara', draftStore });
    if (onboarding.isRestoring) return null;
    return <OnboardingFlowScreen onboarding={onboarding} />;
  }

  const render = (userId: string) => renderWithProviders(<Harness userId={userId} />);
  return { ...memory, draftStore, Harness, render };
}

const press = (name: string) => userEvent.setup().press(screen.getByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe('onboarding journey', () => {
  test('a user who leaves mid-way finds their answers and step again', async () => {
    const { render, draftStore } = setup();
    const first = await render(USER_A);

    await press("Let's start");
    expect(await screen.findByLabelText('First name')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Samira');
    await press('Continue');
    await screen.findByRole('checkbox', { name: 'Health & fitness' });
    await userEvent.setup().press(screen.getByRole('checkbox', { name: 'Health & fitness' }));
    await press('Continue');
    await screen.findByLabelText('Your goal');
    await fireEvent.changeText(screen.getByLabelText('Your goal'), 'Run 10 km');
    await press('Continue');

    await waitFor(() =>
      expect(draftStore.load(USER_A)).resolves.toMatchObject({
        step: 'horizon',
        answers: { displayName: 'Samira', focusAreas: ['health'], goalTitle: 'Run 10 km' },
      }),
    );

    // The app is killed and reopened.
    await first.unmount();
    await render(USER_A);

    expect(await screen.findByRole('radio', { name: /In a year/ })).toBeOnTheScreen();
    await press('Back');
    expect(await screen.findByDisplayValue('Run 10 km')).toBeOnTheScreen();
  });

  test('a draft belonging to another account is discarded, not shown', async () => {
    const { render, items, storage, draftStore } = setup();
    // A draft saved by B but filed under A's key: tampering or a stale migration.
    await draftStore.save(USER_B, 'goal', completeAnswers({ displayName: 'Bob' }));
    const foreign = items.get(`${draftKey(USER_B)}`) ?? (await storage.getItem(draftKey(USER_B)));
    await storage.setItem(draftKey(USER_A), String(foreign));

    await render(USER_A);

    expect(
      await screen.findByRole('heading', { name: /shape your first plan/i }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Bob')).toBeNull();
    await expect(storage.getItem(draftKey(USER_A))).resolves.toBeNull();
  });

  test('a corrupt draft is removed and the user starts over', async () => {
    const { render, storage } = setup();
    await storage.setItem(draftKey(USER_A), '{not json');

    await render(USER_A);

    expect(
      await screen.findByRole('heading', { name: /shape your first plan/i }),
    ).toBeOnTheScreen();
    await expect(storage.getItem(draftKey(USER_A))).resolves.toBeNull();
  });

  test('switching accounts never shows or overwrites the other account’s draft', async () => {
    const { render, draftStore, Harness } = setup();
    await draftStore.save(USER_A, 'goal', completeAnswers({ displayName: 'Alice' }));

    const view = await render(USER_A);
    expect(await screen.findByDisplayValue('Run 5 km')).toBeOnTheScreen();

    await view.rerender(<Harness userId={USER_B} />);

    // B starts fresh: no trace of A's answers on screen.
    expect(
      await screen.findByRole('heading', { name: /shape your first plan/i }),
    ).toBeOnTheScreen();
    expect(screen.queryByDisplayValue('Run 5 km')).toBeNull();

    await press("Let's start");
    await fireEvent.changeText(await screen.findByLabelText('First name'), 'Bea');
    await press('Continue');

    await waitFor(() =>
      expect(draftStore.load(USER_B)).resolves.toMatchObject({
        answers: { displayName: 'Bea' },
      }),
    );
    // A's draft is untouched by B's activity.
    await expect(draftStore.load(USER_A)).resolves.toMatchObject({
      step: 'goal',
      answers: { displayName: 'Alice', goalTitle: 'Run 5 km' },
    });
  });

  test('switching back restores the first account’s own draft', async () => {
    const { render, draftStore, Harness } = setup();
    await draftStore.save(USER_A, 'horizon', completeAnswers());

    const view = await render(USER_A);
    await screen.findByRole('radio', { name: /In a year/ });
    await view.rerender(<Harness userId={USER_B} />);
    await screen.findByRole('heading', { name: /shape your first plan/i });
    await view.rerender(<Harness userId={USER_A} />);

    expect(await screen.findByRole('radio', { name: /In a year/ })).toBeOnTheScreen();
  });

  test('a submit still in flight for the previous account cannot move the next account', async () => {
    let settleSubmit: (value: unknown) => void = () => undefined;
    mockRpc.mockReturnValue(
      new Promise((resolve) => {
        settleSubmit = resolve;
      }),
    );
    const { render, draftStore, Harness } = setup();
    await draftStore.save(USER_A, 'review', completeAnswers());
    // B is also on the review step, where a stale "fix this step" would visibly move them.
    await draftStore.save(USER_B, 'review', completeAnswers({ displayName: 'Bea' }));

    const view = await render(USER_A);
    await press('Build my first day');
    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));

    await view.rerender(<Harness userId={USER_B} />);
    await screen.findByRole('button', { name: 'Edit Name' });

    // The server rejects A's goal title after the switch.
    await act(async () => {
      settleSubmit({ data: null, error: { code: '22023', message: 'invalid_goal_title' } });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByRole('button', { name: 'Edit Name' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Your goal')).toBeNull();
  });

  test('after a successful submit the draft is gone and a late save cannot bring it back', async () => {
    const { render, draftStore, storage } = setup();
    await draftStore.save(USER_A, 'review', completeAnswers());

    await render(USER_A);
    await press('Build my first day');

    expect(
      await screen.findByRole('heading', { name: /Your first day is ready/ }),
    ).toBeOnTheScreen();
    await waitFor(() => expect(storage.getItem(draftKey(USER_A))).resolves.toBeNull());

    // A background save from the unmounting screen arrives after the clear.
    await draftStore.save(USER_A, 'review', completeAnswers());
    await expect(storage.getItem(draftKey(USER_A))).resolves.toBeNull();
  });

  test('a failed submit keeps the draft so nothing is lost offline', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '', message: 'Failed to fetch' } });
    const { render, draftStore } = setup();
    await draftStore.save(USER_A, 'review', completeAnswers());

    await render(USER_A);
    await press('Build my first day');

    await screen.findByText(/Your answers are kept/);
    await expect(draftStore.load(USER_A)).resolves.toMatchObject({
      step: 'review',
      answers: { goalTitle: 'Run 5 km' },
    });
  });

  test('a save that fails never blocks moving forward', async () => {
    const { render, storage } = setup();
    jest.spyOn(storage, 'setItem').mockRejectedValue(new Error('keystore full'));

    await render(USER_A);
    await press("Let's start");
    expect(await screen.findByLabelText('First name')).toBeOnTheScreen();
    await press('Continue');
    expect(await screen.findByRole('checkbox', { name: 'Health & fitness' })).toBeOnTheScreen();
  });
});
